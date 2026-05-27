/**
 * Tonka Spark Post Visual Prompt Image Delete Controller
 * Remove generated image from visual prompt
 */

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

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const deleteImageParamsSchema = z.object({
  id: z.string().min(1, 'Entry ID is required'),
  imageUrl: z.string().min(1, 'Image URL is required'),
  promptId: z.string().min(1, 'Prompt ID is required'),
});

// ----------------------------------------------------------------------------
// Controller
// ----------------------------------------------------------------------------

/**
 * Delete Image from Visual Prompt
 * DELETE /api/tonka-spark-post/:id/visual-prompts/:promptId/images/:imageUrl
 */
export const deleteVisualPromptImage = async (req, res) => {
  try {
    const { id, imageUrl, promptId } = deleteImageParamsSchema.parse(
      req.params
    );

    // Decode the URL-encoded imageUrl parameter
    const decodedImageUrl = decodeURIComponent(imageUrl);

    logger.info('Deleting image from visual prompt', {
      entryId: id,
      imageUrl: decodedImageUrl,
      promptId,
      requestId: req.id,
    });

    // Determine query type (content_id vs _id)
    const query = id.includes('-') ? { content_id: id } : { _id: id };

    // Look up the stored r2_key (preferred) before mutating Mongo — falls back
    // to parsing the key out of the URL for legacy records without r2_key.
    const existing = await TonkaSparkPosts.findOne(
      { ...query, 'visual_prompts.id': promptId },
      { 'visual_prompts.$': 1 }
    );
    const existingImage = existing?.visual_prompts?.[0]?.images?.find(
      img => img.url === decodedImageUrl
    );
    const r2Key =
      existingImage?.r2_key || keyFromPublicUrl(decodedImageUrl) || null;

    if (r2Key) {
      try {
        await deleteObject(r2Key);
      } catch (r2Error) {
        logger.error('Failed to delete R2 object for visual prompt image', {
          entryId: id,
          error: r2Error.message,
          promptId,
          r2Key,
          requestId: req.id,
        });
        const apiError = new ApiError(
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          'Failed to delete underlying R2 object',
          502
        );
        return res.status(apiError.statusCode).json({
          code: apiError.code,
          error: apiError.message,
        });
      }
    } else {
      logger.warn(
        'Skipping R2 delete — no r2_key and URL is not under R2_PUBLIC_BASE_URL (legacy Azure asset?)',
        { entryId: id, imageUrl: decodedImageUrl, promptId }
      );
    }

    // Remove the image from the prompt's images array
    const updatedEntry = await TonkaSparkPosts.findOneAndUpdate(
      {
        ...query,
        'visual_prompts.id': promptId,
      },
      {
        $pull: {
          'visual_prompts.$.images': { url: decodedImageUrl },
        },
        $set: { updated_at: new Date() },
      },
      { new: true, projection: { _id: 1, content_id: 1, visual_prompts: 1 } }
    );

    if (!updatedEntry) {
      const error = new ApiError(
        ERROR_CODES.NOT_FOUND,
        `Tonka Spark Post or visual prompt not found`,
        404
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    // Find the updated prompt
    const updatedPrompt = updatedEntry.visual_prompts.find(
      prompt => prompt.id === promptId
    );

    const response = {
      content_id: updatedEntry.content_id,
      image_count: updatedPrompt?.images?.length || 0,
      message: 'Image deleted from visual prompt successfully',
      prompt_id: promptId,
    };

    logger.info('Image deleted from visual prompt successfully', {
      contentId: updatedEntry.content_id,
      imageCount: updatedPrompt?.images?.length,
      imageUrl: decodedImageUrl,
      promptId,
      requestId: req.id,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error deleting image from visual prompt', {
      entryId: req.params.id,
      error: error.message,
      imageUrl: req.params.imageUrl,
      promptId: req.params.promptId,
      requestId: req.id,
      stack: error.stack,
    });

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

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
    res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      message: 'Failed to delete image from visual prompt',
    });
  }
};
