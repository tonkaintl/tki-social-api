import {
  PIPELINE_ERROR_CODE,
  RUN_TRIGGER,
} from '../../../constants/writersroom.js';
import {
  peekNextIdea,
  takeNextIdea,
} from '../../../services/writersRoom/ideaRotation.js';
import { runPipeline } from '../../../services/writersRoom/index.js';
import { logger } from '../../../utils/logger.js';

/**
 * Run the full Writers Room pipeline.
 *
 * Body shape (everything is optional except story_seed):
 *   {
 *     story_seed?:           string,   // required unless useRotation=true
 *     useRotation?:          boolean,  // pull next idea from SEASON-01-IDEAS.md
 *     peek?:                 boolean,  // when useRotation=true, peek without advancing
 *     notifier_email?:       string,
 *     project_mode?:         string,
 *     target_brand?:         string,
 *     target_audience?:      string,
 *     fact_to_fiction?:      number,
 *     creativity_to_reporter?: number,
 *     tone_strictness?:      number,
 *     draft_length?:         'short' | 'medium' | 'long',
 *     enable_research?:      boolean,
 *     facts?:                string,
 *     output_blog_post?:     boolean,
 *     output_future_story_arc?: boolean,
 *     output_visual_prompts?: boolean,
 *     output_reference_doc?: boolean,
 *   }
 *
 * Response: { ok, output, trace, durationMs, requestId, idea?, error? }
 */
export async function runWritersRoom(req, res) {
  try {
    const { peek = false, useRotation = false, ...rest } = req.body || {};

    let input = { ...rest };
    let rotationInfo = null;

    if (useRotation || !input.story_seed) {
      try {
        rotationInfo = peek ? await peekNextIdea() : await takeNextIdea();
        input.story_seed = rotationInfo.idea;
      } catch (rotErr) {
        logger.error('[WritersRoom] Idea rotation lookup failed', {
          error: rotErr.message,
          requestId: req.id,
        });
        return res.status(500).json({
          code: rotErr.code || PIPELINE_ERROR_CODE.IDEA_ROTATION_READ_FAILED,
          message: rotErr.message,
          requestId: req.id,
        });
      }
    }

    if (!input.story_seed) {
      return res.status(400).json({
        code: PIPELINE_ERROR_CODE.MISSING_STORY_SEED,
        message: 'story_seed is required (or set useRotation=true)',
        requestId: req.id,
      });
    }

    logger.info('[WritersRoom] Starting pipeline run', {
      requestId: req.id,
      story_seed: input.story_seed,
      useRotation,
    });

    const result = await runPipeline(input, {
      ideaRotation: rotationInfo
        ? {
            cursor: rotationInfo.cursor,
            total_ideas: rotationInfo.total_ideas,
          }
        : null,
      requestId: req.id,
      triggeredBy: RUN_TRIGGER.API,
    });

    if (!result.ok) {
      return res.status(500).json({
        code: result.error.code,
        durationMs: result.durationMs,
        message: result.error.message,
        requestId: req.id,
        runId: result.runId,
        trace: result.trace,
      });
    }

    return res.status(200).json({
      durationMs: result.durationMs,
      idea: rotationInfo,
      ok: true,
      output: result.output,
      requestId: req.id,
      runId: result.runId,
      sparkPostDocumentId: result.sparkPostDocumentId,
      status: result.status,
      trace: result.trace,
    });
  } catch (err) {
    logger.error('[WritersRoom] Unhandled error in run controller', {
      error: err.message,
      requestId: req.id,
      stack: err.stack,
    });
    return res.status(500).json({
      code: PIPELINE_ERROR_CODE.PIPELINE_FAILED,
      message: err.message,
      requestId: req.id,
    });
  }
}
