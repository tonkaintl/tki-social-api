// ----------------------------------------------------------------------------
// PATCH /api/tonka-spark-post/:id/final-draft
// Update final_draft content (minor edits when reviewers spot incorrect info).
// ----------------------------------------------------------------------------

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import TonkaSparkPosts from '../../../models/tonkaSparkPost.model.js';
import { logger } from '../../../utils/logger.js';

const paramsSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
});

const finalDraftBodySchema = z
  .object({
    draft_markdown: z.string().optional(),
    role: z.string().optional(),
    summary: z.string().optional(),
    thesis: z.string().optional(),
    title: z.string().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one final_draft field must be provided',
  });

export const updateFinalDraft = async (req, res) => {
  try {
    const { id } = paramsSchema.parse(req.params);
    const updates = finalDraftBodySchema.parse(req.body);

    const query = id.includes('-') ? { content_id: id } : { _id: id };

    const setFields = { updated_at: new Date() };
    for (const [key, value] of Object.entries(updates)) {
      setFields[`final_draft.${key}`] = value;
    }

    logger.info('Updating tonka spark post final_draft', {
      fields: Object.keys(updates),
      postId: id,
      requestId: req.id,
    });

    const updated = await TonkaSparkPosts.findOneAndUpdate(
      query,
      { $set: setFields },
      {
        new: true,
        projection: { _id: 1, content_id: 1, final_draft: 1, updated_at: 1 },
        runValidators: true,
      }
    );

    if (!updated) {
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

    logger.info('Tonka spark post final_draft updated', {
      contentId: updated.content_id,
      requestId: req.id,
    });

    return res.status(200).json({
      content_id: updated.content_id,
      final_draft: updated.final_draft,
      requestId: req.id,
      updated_at: updated.updated_at,
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

    logger.error('Error updating tonka spark post final_draft', {
      error: error.message,
      postId: req.params.id,
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
      message: 'Failed to update final draft',
    });
  }
};
