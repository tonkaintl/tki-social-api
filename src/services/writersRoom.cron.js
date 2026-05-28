// ----------------------------------------------------------------------------
// Writers Room — cron scheduler + shared "one run" executor.
//
// Runs the pipeline once a day (default 07:00 America/Chicago, Mon–Fri).
// Schedule, timezone, AND every pipeline knob are env-driven so cadence and
// behavior can be tuned without a deploy. Each fire:
//
//   1. Atomically claims the next UNUSED idea from writers_room_ideas (the
//      frontend manages this collection via /api/writers-room/ideas).
//   2. Builds an input override pinned to fact_to_fiction = 100 (pure facts)
//      with random creativity_to_reporter ∈ [MIN, MAX] and random
//      tone_strictness ∈ [MIN, MAX]. The actual values are logged and end up
//      on the run record's `input` field for reproducibility.
//   3. Runs the pipeline, marks the idea USED on completion, releases the
//      idea back to UNUSED if the pipeline throws BEFORE the run is logged.
//
// The same "one run" path is also exposed as runWritersRoomOnce() so the
// fire-and-forget admin endpoint (POST /api/writers-room/run-next) can
// trigger additional runs without waiting for the next scheduled fire.
//
// The cron always forwards finished runs to tonka_spark_posts and fires
// the notification email — anything else would silently burn LLM credits
// without producing a publish-ready artifact. To pause the cron entirely,
// set WRITERS_ROOM_CRON_ENABLED=false.
// ----------------------------------------------------------------------------

import cron from 'node-cron';

import { config } from '../config/env.js';
import { RUN_TRIGGER } from '../constants/writersroom.js';
import { logger } from '../utils/logger.js';

import {
  markIdeaUsed,
  releaseIdea,
  takeNextIdeaFromDb,
} from './writersRoom/ideas.service.js';
import { runPipeline } from './writersRoom/index.js';

let isRunning = false;

// Inclusive int range [min, max]. Falls back to min when the env range is
// inverted (caller misconfig), so we don't crash.
function randomInt(min, max) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

// Build the input shape POST /api/writers-room/run expects, populated from
// env constants + freshly rolled randoms. Logged so a flaky run can be
// reproduced by copy-pasting the input back into the endpoint.
function buildCronPipelineInput(storySeed) {
  return {
    creativity_to_reporter: randomInt(
      config.WRITERS_ROOM_CREATIVITY_MIN,
      config.WRITERS_ROOM_CREATIVITY_MAX
    ),
    draft_length: config.WRITERS_ROOM_DRAFT_LENGTH,
    enable_research: config.WRITERS_ROOM_ENABLE_RESEARCH,
    fact_to_fiction: config.WRITERS_ROOM_FACT_TO_FICTION,
    output_blog_post: config.WRITERS_ROOM_OUTPUT_BLOG_POST,
    output_future_story_arc: config.WRITERS_ROOM_OUTPUT_FUTURE_STORY_ARC,
    output_visual_prompts: config.WRITERS_ROOM_OUTPUT_VISUAL_PROMPTS,
    project_mode: config.WRITERS_ROOM_PROJECT_MODE,
    story_seed: storySeed,
    target_brand: config.WRITERS_ROOM_TARGET_BRAND,
    tone_strictness: randomInt(
      config.WRITERS_ROOM_TONE_MIN,
      config.WRITERS_ROOM_TONE_MAX
    ),
  };
}

// Run the pipeline against a pre-claimed idea using the cron's env-driven
// inputs. Handles mark-used / release-on-failure. Pure — no isRunning guard,
// no logging-around-the-edges of "skipped" cases. Both the scheduled cron
// (via runWithGuard) and the manual fire-and-forget endpoint (via
// runWritersRoomOnce) call this.
async function executeCronRun(claimedIdea, triggerLabel) {
  const pipelineInput = buildCronPipelineInput(claimedIdea.title);

  logger.info('[WritersRoom] Pipeline run started', {
    creativity: pipelineInput.creativity_to_reporter,
    fact: pipelineInput.fact_to_fiction,
    idea: claimedIdea.title,
    ideaId: claimedIdea._id?.toString(),
    season: claimedIdea.season,
    tone: pipelineInput.tone_strictness,
    triggeredBy: triggerLabel,
  });

  try {
    const result = await runPipeline(pipelineInput, {
      // Always publish + email — see file-header note on why this isn't
      // env-gated. The orchestrator default is also true, but pinning it
      // here makes intent local to the cron path.
      forwardToSparkPost: true,
      triggeredBy: RUN_TRIGGER.CRON,
    });

    // Flip the idea to USED regardless of pipeline status — a failed run
    // still "consumed" the idea (cost the API call, surfaced the seed). The
    // operator can manually flip it back to UNUSED from the admin UI if
    // they want a re-run.
    await markIdeaUsed(claimedIdea._id, result.runId);

    if (!result.ok) {
      logger.error('[WritersRoom] Pipeline run failed', {
        error: result.error,
        idea: claimedIdea.title,
        runId: result.runId,
        triggeredBy: triggerLabel,
      });
    } else {
      logger.info('[WritersRoom] Pipeline run complete', {
        durationMs: result.durationMs,
        idea: claimedIdea.title,
        runId: result.runId,
        sparkPostDocumentId: result.sparkPostDocumentId,
        status: result.status,
        steps: result.trace.length,
        triggeredBy: triggerLabel,
      });
    }
    return result;
  } catch (err) {
    // runPipeline normally catches its own errors, but if it throws before
    // creating the run record (e.g. story_seed missing), release the idea
    // so the next fire picks it back up.
    await releaseIdea(claimedIdea._id);
    logger.error('[WritersRoom] Pipeline run threw before completion', {
      error: err.message,
      ideaId: claimedIdea._id?.toString(),
      stack: err.stack,
      triggeredBy: triggerLabel,
    });
    throw err;
  }
}

// Scheduled-cron wrapper: claim + execute, gated by isRunning so two
// schedule fires can't double up on the same atomic claim window (also
// useful when a previous run is still chewing through 3 minutes of LLM
// calls and the next 07:00 trigger rolls around — should be impossible at
// 24-hour cadence, but the guard stays cheap).
async function runWithGuard() {
  if (isRunning) {
    logger.warn(
      '[WritersRoom] Skipping scheduled run — previous run still in progress'
    );
    return;
  }
  isRunning = true;
  let claimedIdea = null;
  try {
    claimedIdea = await takeNextIdeaFromDb();
    await executeCronRun(claimedIdea, 'cron');
  } catch (err) {
    if (claimedIdea && err.code !== 'IDEAS_SEASON_EXHAUSTED') {
      // executeCronRun already released on its own throw path, but if the
      // throw came from somewhere else after the claim, release here too.
      await releaseIdea(claimedIdea._id);
    }
    logger.error('[WritersRoom] Cron run errored before pipeline finished', {
      code: err.code,
      error: err.message,
      stack: err.stack,
    });
  } finally {
    isRunning = false;
  }
}

export function startWritersRoomCron() {
  if (!config.WRITERS_ROOM_CRON_ENABLED) {
    logger.info(
      '[WritersRoom] Cron disabled (WRITERS_ROOM_CRON_ENABLED=false)'
    );
    return;
  }

  if (!cron.validate(config.WRITERS_ROOM_CRON_SCHEDULE)) {
    logger.error('[WritersRoom] Invalid cron schedule', {
      schedule: config.WRITERS_ROOM_CRON_SCHEDULE,
    });
    return;
  }

  cron.schedule(config.WRITERS_ROOM_CRON_SCHEDULE, runWithGuard, {
    scheduled: true,
    timezone: config.WRITERS_ROOM_CRON_TIMEZONE,
  });

  logger.info('[WritersRoom] Cron scheduled', {
    schedule: config.WRITERS_ROOM_CRON_SCHEDULE,
    timezone: config.WRITERS_ROOM_CRON_TIMEZONE,
  });
}

// Exported so an admin endpoint or a test harness can trigger the same
// SCHEDULED path the cron uses (with the isRunning guard) without waiting
// for the next fire. If a scheduled run is already mid-flight, this skips.
export async function runWritersRoomNow() {
  return runWithGuard();
}

// Fire-and-forget claim + execute, NO concurrency guard. Used by the
// POST /api/writers-room/run-next endpoint so the operator can manually
// trigger multiple parallel runs (each atomic claim picks a different
// idea). Returns the claimed idea so the caller can respond immediately;
// the pipeline keeps running in the background.
//
// Throws synchronously if the claim fails (e.g. season exhausted). After
// a successful claim, never throws — pipeline errors are logged.
export async function runWritersRoomOnce(triggerLabel = 'manual') {
  const claimedIdea = await takeNextIdeaFromDb();
  // Intentionally NOT awaited — caller already has the idea and the
  // response is ready to ship.
  executeCronRun(claimedIdea, triggerLabel).catch(err => {
    logger.error('[WritersRoom] Background manual run failed', {
      error: err.message,
      ideaId: claimedIdea._id?.toString(),
    });
  });
  return claimedIdea;
}
