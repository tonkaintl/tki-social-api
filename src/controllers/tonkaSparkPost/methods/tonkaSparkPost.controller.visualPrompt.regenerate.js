/**
 * Tonka Spark Post Visual Prompt Regenerate Controller
 *
 * Regenerates the TEXT prompt for a single visual prompt (not the image).
 * Grounds the new prompt in the post's final_draft so it actually reflects the
 * article, and lets the caller pick the "tone" via `intent`
 * (hero / detail / process / environment / metaphor). If `intent` is omitted
 * the prompt's existing intent is reused.
 *
 * POST /api/tonka-spark-post/:id/visual-prompts/:promptId/regenerate
 */

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import { VISUAL_PROMPT_INTENT_VALUES } from '../../../constants/writersroom.js';
import TonkaSparkPosts from '../../../models/tonkaSparkPost.model.js';
import { extractJson } from '../../../services/writersRoom/llm/extractJson.js';
import { callLlmFromPrompt } from '../../../services/writersRoom/llm/index.js';
import { machineHintFor } from '../../../services/writersRoom/machineHint.js';
import { logger } from '../../../utils/logger.js';
import { sanitizeText } from '../../../utils/sanitizeControlChars.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const paramsSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
  promptId: z.string().min(1, 'Prompt ID is required'),
});

const bodySchema = z.object({
  // Optional freeform steer (e.g. "emphasize the rust", "show it at dusk").
  instructions: z.string().max(2000).optional(),
  // Optional tone override. When omitted, the prompt's current intent is kept.
  intent: z.enum(VISUAL_PROMPT_INTENT_VALUES).optional(),
});

// ----------------------------------------------------------------------------
// Controller
// ----------------------------------------------------------------------------

export const regenerateVisualPrompt = async (req, res) => {
  try {
    const { id, promptId } = paramsSchema.parse(req.params);
    const { instructions, intent } = bodySchema.parse(req.body ?? {});

    // Accept either content_id (UUID) or Mongo _id.
    const query = id.includes('-') ? { content_id: id } : { _id: id };

    const entry = await TonkaSparkPosts.findOne(query);

    if (!entry) {
      const error = new ApiError(
        ERROR_CODES.NOT_FOUND,
        `Tonka Spark Post not found: ${id}`,
        404
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    const existingPrompt = entry.visual_prompts?.find(
      prompt => prompt.id === promptId
    );

    if (!existingPrompt) {
      const error = new ApiError(
        ERROR_CODES.NOT_FOUND,
        `Visual prompt not found: ${promptId}`,
        404
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    // Effective intent: explicit override > current intent > 'hero'.
    const effectiveIntent = intent || existingPrompt.intent || 'hero';

    const finalDraft = entry.final_draft || {};

    logger.info('Regenerating visual prompt', {
      effectiveIntent,
      entryId: id,
      promptId,
      requestId: req.id,
    });

    // Build the LLM context. Mirror the keys the prompt package references
    // ({{intent}}, {{instructions}}, {{final_draft.*}}).
    const ctx = {
      final_draft: {
        draft_markdown: finalDraft.draft_markdown || '',
        summary: finalDraft.summary || '',
        thesis: finalDraft.thesis || '',
        title: finalDraft.title || '',
      },
      instructions: instructions || '',
      intent: effectiveIntent,
      // Seeded on the same title the 5-shot Art Director used, so a re-rolled
      // prompt lands on the same machine as its siblings instead of drifting.
      machine_hint: machineHintFor(finalDraft.title),
    };

    const result = await callLlmFromPrompt('visualPromptRegen', ctx);
    const parsed = typeof result === 'string' ? extractJson(result) : result;
    const newPromptText = parsed?.prompt;

    if (!newPromptText || typeof newPromptText !== 'string') {
      const error = new ApiError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Visual prompt generation returned no prompt text'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    // Scrub the same control-char garbage the pipeline strips before persist.
    const cleanedPrompt = sanitizeText(newPromptText);

    const updatedEntry = await TonkaSparkPosts.findOneAndUpdate(
      {
        ...query,
        'visual_prompts.id': promptId,
      },
      {
        $set: {
          updated_at: new Date(),
          'visual_prompts.$.intent': effectiveIntent,
          'visual_prompts.$.prompt': cleanedPrompt,
        },
      },
      {
        new: true,
        projection: { _id: 1, content_id: 1, visual_prompts: 1 },
        runValidators: true,
      }
    );

    if (!updatedEntry) {
      const error = new ApiError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to update visual prompt'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    const updatedPrompt = updatedEntry.visual_prompts.find(
      prompt => prompt.id === promptId
    );

    logger.info('Visual prompt regenerated', {
      contentId: updatedEntry.content_id,
      intent: effectiveIntent,
      promptId,
      requestId: req.id,
    });

    return res.status(200).json({
      content_id: updatedEntry.content_id,
      message: 'Visual prompt regenerated successfully',
      prompt_id: promptId,
      requestId: req.id,
      visual_prompt: updatedPrompt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request data',
        400,
        error.errors
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        details: apiError.details,
        error: apiError.message,
      });
    }

    logger.error('Error regenerating visual prompt', {
      entryId: req.params.id,
      error: error.message,
      promptId: req.params.promptId,
      requestId: req.id,
      stack: error.stack,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      message: 'Failed to regenerate visual prompt',
    });
  }
};
