// ----------------------------------------------------------------------------
// Writers Room — pipeline orchestrator.
//
// Single end-to-end function that the controller (and cron) calls. Replaces
// the n8n "Writer's Room" workflow. Each step is one file in nodes/; this
// orchestrator wires them in order, runs the parallel writer+research fan-
// out, gates the optional output nodes (visual prompts, blog post package,
// future story arc), and on success forwards the final payload to
// tonka_spark_posts (the production sink that triggers the notification
// email).
//
// Every run is also persisted to writers_room_runs with intermediate
// snapshots, so failed/partial runs can be mined for gems (good writer
// notes, useful research, etc.). See persistence.service.js.
//
// Pipeline (high level):
//   1. inputNormalizer   — coerce caller input → canonical shape
//   2. projectMode       — lift sliders/draft into ctx.creative + ctx.project
//   3. genreToneRouter   — Gemini routing call → ctx.writers map
//   4. parallel fan-out  — enabled writer brainstorms + (when
//                          research.enable_research is true) the
//                          Perplexity researcher, all in parallel
//   5. buildWriterPanel  — merge brainstorms by role; merge research findings
//                          + citations into ctx.research
//   6. draftContext      — attach brand + mode profiles, build head writer
//                          system message (now grounded by research findings)
//   7. headWriter        — main draft generation
//   8. finalEditor       — light polishing pass
//   9. fanout outputs    — optional: artDirector / socialMediaDirector /
//                          futureStoryArc (gated by ctx.outputs.*)
//  10. finalDispatch     — assemble the final payload
//  11. forwardToSparkPost — save final_payload to tonka_spark_posts +
//                          fire notification email (skipped on failure)
//
// Returns: { ok, output, trace, runId, sparkPostDocumentId?, error? }
// ----------------------------------------------------------------------------

import { config } from '../../config/env.js';
import {
  PIPELINE_ERROR_CODE,
  RUN_STATUS,
  RUN_TRIGGER,
} from '../../constants/writersroom.js';
import { logger } from '../../utils/logger.js';
import { saveTonkaSparkPost } from '../tonkaSparkPost.service.js';

import { activeWriterRoles } from './decisions.js';
import { aiTellsCheck } from './nodes/aiTellsCheck.js';
import { defaultVisualPrompts, artDirector } from './nodes/artDirector.js';
import { buildWriterPanel } from './nodes/buildWriterPanel.js';
import { draftContext } from './nodes/draftContext.js';
import { finalDispatch } from './nodes/finalDispatch.js';
import { finalEditor } from './nodes/finalEditor.js';
import {
  defaultFutureStoryArc,
  futureStoryArc,
} from './nodes/futureStoryArc.js';
import { genreToneRouter } from './nodes/genreToneRouter.js';
import { headWriter } from './nodes/headWriter.js';
import { inputNormalizer } from './nodes/inputNormalizer.js';
import { projectMode } from './nodes/projectMode.js';
import { researcher } from './nodes/researcher.js';
import {
  defaultBlogPost,
  socialMediaDirector,
} from './nodes/socialMediaDirector.js';
import { writerAction } from './nodes/writers/action.js';
import { writerBiographer } from './nodes/writers/biographer.js';
import { writerComedy } from './nodes/writers/comedy.js';
import { writerDocumentary } from './nodes/writers/documentary.js';
import { writerHistoric } from './nodes/writers/historic.js';
import { writerSciFi } from './nodes/writers/scifi.js';
import {
  appendTrace,
  createRun,
  finalizeFailure,
  finalizeSuccess,
  recordSnapshot,
} from './persistence.service.js';

// Map writer role → node function. Used by the parallel fan-out.
const WRITER_FUNCS = {
  action: writerAction,
  biographer: writerBiographer,
  comedy: writerComedy,
  documentary: writerDocumentary,
  historic: writerHistoric,
  scifi: writerSciFi,
};

// Tiny step runner — wraps each node call in timing + error capture, pushes
// the trace entry onto the in-memory `trace` array, and (when a runId is
// active) appends to the persisted trace too. This way every step shows up
// in writers_room_runs even if the pipeline crashes mid-flight.
async function step(trace, runId, name, fn) {
  const startedAt = Date.now();
  try {
    const result = await fn();
    const entry = { ms: Date.now() - startedAt, name, ok: true };
    trace.push(entry);
    await appendTrace(runId, entry);
    return result;
  } catch (err) {
    const entry = {
      error: err.message,
      errorCode: err.code || null,
      ms: Date.now() - startedAt,
      name,
      ok: false,
    };
    trace.push(entry);
    await appendTrace(runId, entry);
    throw err;
  }
}

export async function runPipeline(input = {}, options = {}) {
  const {
    forwardToSparkPost = true,
    ideaRotation = null,
    requestId = null,
    triggeredBy = RUN_TRIGGER.API,
  } = options;

  const trace = [];
  const startedAt = Date.now();

  // Persist the run record immediately. If creation fails (DB down), we still
  // run the pipeline — the run just won't be archived. The orchestrator
  // never fails on persistence errors; it logs and continues.
  const runDoc = await createRun({
    ideaRotation,
    input,
    requestId,
    triggeredBy,
  });
  const runId = runDoc?._id || null;

  try {
    if (!input.story_seed || String(input.story_seed).trim() === '') {
      const err = new Error('story_seed is required');
      err.code = PIPELINE_ERROR_CODE.MISSING_STORY_SEED;
      throw err;
    }

    // 1. Input normalizer + 2. Project mode (both synchronous).
    let ctx = await step(trace, runId, 'inputNormalizer', () =>
      Promise.resolve(inputNormalizer(input))
    );
    ctx = await step(trace, runId, 'projectMode', () =>
      Promise.resolve(projectMode(ctx))
    );

    // 3. Router (Gemini) — picks which writers to enable.
    ctx = await step(trace, runId, 'genreToneRouter', () =>
      genreToneRouter(ctx)
    );
    await recordSnapshot(runId, { writers: ctx.writers });

    // 4. Parallel fan-out: writer brainstorms + (optionally) the Perplexity
    //    researcher. Latency is hidden behind the slowest writer.
    const activeRoles = activeWriterRoles(ctx);
    const writerCalls = activeRoles.map(role =>
      step(trace, runId, `writers/${role}`, () => WRITER_FUNCS[role](ctx))
    );
    const researchCall = step(trace, runId, 'researcher', () =>
      researcher(ctx)
    );

    const [writerResults, researchResult] = await Promise.all([
      Promise.all(writerCalls),
      researchCall,
    ]);

    if (researchResult?.research) {
      ctx = {
        ...ctx,
        research: { ...ctx.research, ...researchResult.research },
      };
    }
    await recordSnapshot(runId, { research: ctx.research });

    // 5. Merge brainstorms.
    ctx = await step(trace, runId, 'buildWriterPanel', () =>
      Promise.resolve(buildWriterPanel(ctx, writerResults))
    );
    await recordSnapshot(runId, {
      writer_notes: ctx.writer_notes,
      writer_panel: ctx.writer_panel,
    });

    // 6. Attach brand + mode profiles, build the Head Writer system message.
    ctx = await step(trace, runId, 'draftContext', () =>
      Promise.resolve(draftContext(ctx))
    );
    await recordSnapshot(runId, {
      head_writer_system_message: ctx.head_writer_system_message,
    });

    // 7. Head writer + 8. Final editor.
    ctx = await step(trace, runId, 'headWriter', () => headWriter(ctx));
    await recordSnapshot(runId, { head_draft: ctx.head_draft });

    ctx = await step(trace, runId, 'finalEditor', () => finalEditor(ctx));
    await recordSnapshot(runId, { final_draft: ctx.final_draft });

    // 8.5. AI-tells check — scans the edited draft against the admin-
    //      managed tells dictionary. Attaches ctx.ai_tells = { tells_found,
    //      tells_count, severity_score }. Never throws; if the dictionary
    //      is empty or Mongo isn't connected, returns zero matches.
    //      Threshold-driven downgrade happens after finalDispatch below.
    ctx = await step(trace, runId, 'aiTellsCheck', () => aiTellsCheck(ctx));
    await recordSnapshot(runId, { ai_tells: ctx.ai_tells });

    // 9. Optional output fans. Each is gated by the input flag.
    if (ctx.outputs?.visual_prompts) {
      ctx = await step(trace, runId, 'artDirector', () => artDirector(ctx));
    } else {
      ctx = defaultVisualPrompts(ctx);
    }
    await recordSnapshot(runId, { visual_prompts: ctx.visual_prompts });

    if (ctx.outputs?.blog_post) {
      ctx = await step(trace, runId, 'socialMediaDirector', () =>
        socialMediaDirector(ctx)
      );
    } else {
      ctx = defaultBlogPost(ctx);
    }
    await recordSnapshot(runId, { blog_post_package: ctx.blog_post_package });

    if (ctx.outputs?.future_story_arc) {
      ctx = await step(trace, runId, 'futureStoryArc', () =>
        futureStoryArc(ctx)
      );
    } else {
      ctx = defaultFutureStoryArc(ctx);
    }
    await recordSnapshot(runId, { future_arcs: ctx.future_arcs });

    // 10. Build the final outbound payload.
    const payload = await step(trace, runId, 'finalDispatch', () =>
      Promise.resolve(finalDispatch(ctx))
    );

    // 11. Forward to tonka_spark_posts (saves doc + sends notification
    //     email). Skipped if:
    //       - the caller asked us not to (forwardToSparkPost: false), OR
    //       - the AI-tells severity score is >= the configured threshold,
    //         in which case we downgrade to PARTIAL and skip the email so
    //         slop drafts don't get auto-published at 6am.
    let sparkPostDocId = null;
    let finalStatus = RUN_STATUS.SUCCEEDED;

    const tellsScore = ctx.ai_tells?.severity_score || 0;
    const tellsThreshold = config.WRITERS_ROOM_TELLS_THRESHOLD;
    const tellsTrippedThreshold = tellsScore >= tellsThreshold;

    if (tellsTrippedThreshold) {
      logger.warn(
        '[WritersRoom] AI-tells threshold tripped — downgrading run to partial',
        {
          runId: runId?.toString(),
          tells_count: ctx.ai_tells?.tells_count,
          tells_score: tellsScore,
          threshold: tellsThreshold,
        }
      );
      finalStatus = RUN_STATUS.PARTIAL;
      const skipEntry = {
        ms: 0,
        name: 'forwardToSparkPost',
        ok: false,
        skipReason: `ai_tells_threshold (score ${tellsScore} >= ${tellsThreshold})`,
      };
      trace.push(skipEntry);
      await appendTrace(runId, skipEntry);
    } else if (forwardToSparkPost) {
      try {
        const sparkPostStart = Date.now();
        const doc = await saveTonkaSparkPost(payload, {
          source: `writers-room/${triggeredBy}`,
        });
        sparkPostDocId = doc._id;
        const sparkEntry = {
          ms: Date.now() - sparkPostStart,
          name: 'forwardToSparkPost',
          ok: true,
        };
        trace.push(sparkEntry);
        await appendTrace(runId, sparkEntry);
      } catch (forwardErr) {
        logger.error('[WritersRoom] Spark-post forward failed', {
          error: forwardErr.message,
          runId: runId?.toString(),
        });
        const sparkEntry = {
          error: forwardErr.message,
          errorCode: forwardErr.code || null,
          ms: 0,
          name: 'forwardToSparkPost',
          ok: false,
        };
        trace.push(sparkEntry);
        await appendTrace(runId, sparkEntry);
        finalStatus = RUN_STATUS.PARTIAL;
      }
    }

    const durationMs = Date.now() - startedAt;
    await finalizeSuccess(runId, {
      durationMs,
      finalPayload: payload,
      sparkPostDocumentId: sparkPostDocId,
      status: finalStatus,
    });

    return {
      durationMs,
      ok: true,
      output: payload,
      runId: runId?.toString() || null,
      sparkPostDocumentId: sparkPostDocId?.toString() || null,
      status: finalStatus,
      trace,
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    logger.error('[WritersRoom] Pipeline failed', {
      error: err.message,
      errorCode: err.code,
      runId: runId?.toString(),
      stack: err.stack,
    });
    await finalizeFailure(runId, { durationMs, error: err });
    return {
      durationMs,
      error: {
        code: err.code || PIPELINE_ERROR_CODE.PIPELINE_FAILED,
        message: err.message,
      },
      ok: false,
      runId: runId?.toString() || null,
      trace,
    };
  }
}

// ----------------------------------------------------------------------------
// Run a single node in isolation — used by POST /api/writers-room/test-node.
// Active writer flags (`writers.<role>.enabled`) are required by the writer
// brainstorm nodes; pass a context object that has them set for the role
// you're testing.
// ----------------------------------------------------------------------------

// Re-export the node registry so the controller can pick a node by name.
export { NODE_REGISTRY } from './nodes/index.js';
