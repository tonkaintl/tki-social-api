// ----------------------------------------------------------------------------
// PATCH /api/tonka-spark-posts/:id/title
// Edit the current title only (final_draft.title). A focused alternative to
// the broader final-draft endpoint when a reviewer just wants to retitle.
// ----------------------------------------------------------------------------

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import TonkaSparkPosts from '../../../models/tonkaSparkPost.model.js';
import { logger } from '../../../utils/logger.js';
import { sanitizeText } from '../../../utils/sanitizeControlChars.js';

const paramsSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
});

const titleBodySchema = z.object({
  title: z
    .string({
      invalid_type_error: 'title must be a string',
      required_error: 'title is required',
    })
    .trim()
    .min(1, 'title cannot be empty'),
});

export const updateTonkaSparkPostTitle = async (req, res) => {
  try {
    const { id } = paramsSchema.parse(req.params);
    const { title: rawTitle } = titleBodySchema.parse(req.body);
    // Scrub mangled control chars (e.g. "" smart-quote garbage) so an edit
    // can't persist the same corruption the LLM pipeline now strips.
    const title = sanitizeText(rawTitle);

    const query = id.includes('-') ? { content_id: id } : { _id: id };

    logger.info('Updating tonka spark post title', {
      postId: id,
      requestId: req.id,
    });

    const updated = await TonkaSparkPosts.findOneAndUpdate(
      query,
      { $set: { 'final_draft.title': title, updated_at: new Date() } },
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

    logger.info('Tonka spark post title updated', {
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

    logger.error('Error updating tonka spark post title', {
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
      message: 'Failed to update title',
    });
  }
};
