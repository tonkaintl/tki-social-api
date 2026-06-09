// ----------------------------------------------------------------------------
// DELETE /api/tonka-spark-posts/:id/main-image
// Clear the post's main image. If it was an owned upload, its R2 object is
// deleted too; a URL-sourced image (possibly shared with a visual prompt) is
// only unset. Idempotent — clearing an already-empty field still succeeds.
// :id may be a content_id or _id.
// ----------------------------------------------------------------------------

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import TonkaSparkPosts from '../../../models/tonkaSparkPost.model.js';
import { deleteOwnedMainImageObject } from '../../../services/tonkaSparkPost.service.js';
import { logger } from '../../../utils/logger.js';

const paramsSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
});

export const removeMainImage = async (req, res) => {
  try {
    const { id } = paramsSchema.parse(req.params);

    const query = id.includes('-') ? { content_id: id } : { _id: id };

    const post = await TonkaSparkPosts.findOne(query, {
      _id: 1,
      content_id: 1,
      post_main_image: 1,
    });

    if (!post) {
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

    // Drop the owned R2 object (no-op for URL-sourced images) before unsetting.
    await deleteOwnedMainImageObject(post.post_main_image);

    const updated = await TonkaSparkPosts.findOneAndUpdate(
      query,
      { $set: { post_main_image: null, updated_at: new Date() } },
      {
        new: true,
        projection: { _id: 1, content_id: 1, post_main_image: 1 },
      }
    );

    logger.info('Post main image removed', {
      contentId: updated.content_id,
      requestId: req.id,
    });

    return res.status(200).json({
      content_id: updated.content_id,
      message: 'Main image removed',
      post_main_image: null,
      requestId: req.id,
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

    logger.error('Error removing post main image', {
      entryId: req.params.id,
      error: error.message,
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
      message: 'Failed to remove post main image',
    });
  }
};
