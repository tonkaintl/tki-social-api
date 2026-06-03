// ----------------------------------------------------------------------------
// PATCH /api/tonka-spark-posts/:id/used
// Toggle the user-controlled "used" flag. The desired state must be supplied
// explicitly as a boolean.
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

const usedBodySchema = z.object({
  is_used: z.boolean({
    invalid_type_error: 'is_used must be a boolean',
    required_error: 'is_used is required',
  }),
});

export const toggleTonkaSparkPostUsed = async (req, res) => {
  try {
    const { id } = paramsSchema.parse(req.params);
    const { is_used } = usedBodySchema.parse(req.body);

    const query = id.includes('-') ? { content_id: id } : { _id: id };

    logger.info('Toggling tonka spark post used flag', {
      is_used,
      postId: id,
      requestId: req.id,
    });

    const updated = await TonkaSparkPosts.findOneAndUpdate(
      query,
      { $set: { is_used, updated_at: new Date() } },
      {
        new: true,
        projection: { _id: 1, content_id: 1, is_used: 1, updated_at: 1 },
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

    logger.info('Tonka spark post used flag updated', {
      contentId: updated.content_id,
      is_used: updated.is_used,
      requestId: req.id,
    });

    return res.status(200).json({
      content_id: updated.content_id,
      is_used: updated.is_used,
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

    logger.error('Error toggling tonka spark post used flag', {
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
      message: 'Failed to toggle used flag',
    });
  }
};
