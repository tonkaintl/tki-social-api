// ----------------------------------------------------------------------------
// Writers Room — cron scheduler.
//
// Runs the pipeline twice a day at 06:00 and 14:00 America/Chicago,
// Monday–Friday. Each run pulls the next idea from SEASON-01-IDEAS.md
// via the rotation service (which atomically advances the cursor).
//
// Schedule is configured in constants/writersroom.js. Enable with
// WRITERS_ROOM_CRON_ENABLED=true in the environment — defaults to false so
// non-prod deploys don't burn LLM tokens on every restart.
// ----------------------------------------------------------------------------

import cron from 'node-cron';

import { config } from '../config/env.js';
import {
  PIPELINE_CRON_SCHEDULE,
  PIPELINE_CRON_TIMEZONE,
  RUN_TRIGGER,
} from '../constants/writersroom.js';
import { logger } from '../utils/logger.js';

import { takeNextIdea } from './writersRoom/ideaRotation.js';
import { runPipeline } from './writersRoom/index.js';

let isRunning = false;

async function runWithGuard() {
  if (isRunning) {
    logger.warn(
      '[WritersRoom] Skipping scheduled run — previous run still in progress'
    );
    return;
  }
  isRunning = true;
  try {
    const rotation = await takeNextIdea();
    logger.info('[WritersRoom] Cron-triggered pipeline run', {
      idea: rotation.idea,
    });
    const result = await runPipeline(
      { story_seed: rotation.idea },
      {
        ideaRotation: {
          cursor: rotation.cursor,
          total_ideas: rotation.total_ideas,
        },
        triggeredBy: RUN_TRIGGER.CRON,
      }
    );
    if (!result.ok) {
      logger.error('[WritersRoom] Cron pipeline failed', {
        error: result.error,
        idea: rotation.idea,
        runId: result.runId,
      });
    } else {
      logger.info('[WritersRoom] Cron pipeline complete', {
        durationMs: result.durationMs,
        idea: rotation.idea,
        runId: result.runId,
        sparkPostDocumentId: result.sparkPostDocumentId,
        status: result.status,
        steps: result.trace.length,
      });
    }
  } catch (err) {
    logger.error('[WritersRoom] Cron run errored before pipeline started', {
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

  if (!cron.validate(PIPELINE_CRON_SCHEDULE)) {
    logger.error('[WritersRoom] Invalid cron schedule', {
      schedule: PIPELINE_CRON_SCHEDULE,
    });
    return;
  }

  cron.schedule(PIPELINE_CRON_SCHEDULE, runWithGuard, {
    scheduled: true,
    timezone: PIPELINE_CRON_TIMEZONE,
  });

  logger.info('[WritersRoom] Cron scheduled', {
    schedule: PIPELINE_CRON_SCHEDULE,
    timezone: PIPELINE_CRON_TIMEZONE,
  });
}

// Exported so an admin endpoint or a test harness can trigger the same
// path the cron uses without waiting for 06:00 or 14:00.
export async function runWritersRoomNow() {
  return runWithGuard();
}
