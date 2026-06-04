// ----------------------------------------------------------------------------
// DELETE /api/tonka-spark-posts/:id
// Hard-delete a Tonka Spark Post — for truly bad sparks that should never be
// published or kept. Accepts either the content_id (UUID, contains dashes) or
// the Mongo _id, matching every other route in this resource.
//
// Best-effort cleanup of any visual-prompt images stored in R2 so we don't
// orphan blobs. R2 failures are logged but do NOT block the DB delete: the
// whole point of this endpoint is to always be able to remove a bad post.
// ----------------------------------------------------------------------------

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import TonkaSparkPosts from '../../../models/tonkaSparkPost.model.js';
import {
  deleteObject,
  keyFromPublicUrl,
} from '../../../services/r2.service.js';
import { logger } from '../../../utils/logger.js';

const paramsSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
});

export const deleteTonkaSparkPost = async (req, res) => {
  try {
    const { id } = paramsSchema.parse(req.params);

    const query = id.includes('-') ? { content_id: id } : { _id: id };

    const post = await TonkaSparkPosts.findOne(query).lean();

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

    // Collect every R2 key referenced by the post's visual-prompt images.
    // Prefer the stored r2_key; fall back to parsing it from the public URL
    // for legacy records. Skip anything we can't resolve to a key.
    const r2Keys = (post.visual_prompts || [])
      .flatMap(prompt => prompt?.images || [])
      .map(img => img?.r2_key || keyFromPublicUrl(img?.url) || null)
      .filter(Boolean);

    let imagesDeleted = 0;
    let imagesFailed = 0;
    for (const key of r2Keys) {
      try {
        await deleteObject(key);
        imagesDeleted += 1;
      } catch (r2Error) {
        imagesFailed += 1;
        logger.error('Failed to delete R2 object during spark post delete', {
          error: r2Error.message,
          postId: id,
          r2Key: key,
          requestId: req.id,
        });
      }
    }

    await TonkaSparkPosts.deleteOne(query);

    logger.info('Tonka Spark Post deleted', {
      contentId: post.content_id,
      imagesDeleted,
      imagesFailed,
      postId: id,
      requestId: req.id,
    });

    return res.status(200).json({
      content_id: post.content_id,
      deleted: true,
      id: post._id,
      images_deleted: imagesDeleted,
      images_failed: imagesFailed,
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

    logger.error('Error deleting Tonka Spark Post', {
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
      message: 'Failed to delete Tonka Spark Post',
    });
  }
};
