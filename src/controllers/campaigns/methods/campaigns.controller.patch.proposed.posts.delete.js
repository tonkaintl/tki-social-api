/**
 * Campaign Proposed Posts Delete Controller
 * Delete specific platforms from proposed posts array
 */

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { SUPPORTED_PROVIDERS } from '../../../utils/contentGeneration.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const deleteProposedPostsParamsSchema = z.object({
  stockNumber: z.string().min(1, 'Stock number is required'),
});

const deleteProposedPostsBodySchema = z.object({
  platforms: z
    .array(z.enum(SUPPORTED_PROVIDERS))
    .min(1, 'At least one platform is required'),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Delete Proposed Posts for Specific Platforms
 * PATCH /campaigns/:stockNumber/delete-proposed-posts
 */
export const deleteProposedPosts = async (req, res) => {
  try {
    const { stockNumber } = deleteProposedPostsParamsSchema.parse(req.params);
    const { platforms } = deleteProposedPostsBodySchema.parse(req.body);

    logger.info('Deleting proposed posts for platforms', {
      platforms,
      requestId: req.requestId,
      stockNumber,
    });

    // Find existing campaign
    const existingCampaign = await SocialCampaigns.findOne({
      stock_number: stockNumber,
    });

    if (!existingCampaign) {
      const error = new ApiError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Campaign not found'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
        stock_number: stockNumber,
      });
    }

    if (
      !existingCampaign.proposed_posts ||
      existingCampaign.proposed_posts.length === 0
    ) {
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'No proposed posts found to delete'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
        stock_number: stockNumber,
      });
    }

    // Filter out the specified platforms from proposed_posts
    const originalCount = existingCampaign.proposed_posts.length;
    const updatedProposedPosts = existingCampaign.proposed_posts.filter(
      post => !platforms.includes(post.platform)
    );
    const deletedCount = originalCount - updatedProposedPosts.length;

    if (deletedCount === 0) {
      logger.warn('No matching platforms found to delete', {
        existingPlatforms: existingCampaign.proposed_posts.map(p => p.platform),
        platforms,
        requestId: req.requestId,
        stockNumber,
      });

      return res.status(400).json({
        code: ERROR_CODES.VALIDATION_ERROR,
        error: 'No matching platforms found to delete',
        existing_platforms: existingCampaign.proposed_posts.map(
          p => p.platform
        ),
        requested_platforms: platforms,
        stock_number: stockNumber,
      });
    }

    // Update campaign with filtered proposed posts
    const updatedCampaign = await SocialCampaigns.findOneAndUpdate(
      { stock_number: stockNumber },
      {
        $set: {
          proposed_posts: updatedProposedPosts,
          updated_at: new Date(),
        },
      },
      { new: true }
    );

    logger.info('Proposed posts deleted successfully', {
      deletedCount,
      deletedPlatforms: platforms,
      remainingCount: updatedProposedPosts.length,
      requestId: req.requestId,
      stockNumber,
    });

    // Format response (same structure as updateProposedPosts)
    const response = {
      campaign: updatedCampaign,
      deleted_count: deletedCount,
      deleted_platforms: platforms,
      message: `${deletedCount} proposed post(s) deleted successfully`,
      proposed_posts: updatedCampaign.proposed_posts, // Direct access to remaining posts
      remaining_count: updatedProposedPosts.length,
      stock_number: stockNumber,
    };

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Request validation failed',
        400,
        error.errors
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        details: apiError.details,
        error: apiError.message,
      });
    }

    logger.error('Error deleting proposed posts', {
      error: error.message,
      requestId: req.requestId,
      stack: error.stack,
      stockNumber: req.params.stockNumber,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
    res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      message: 'Failed to delete proposed posts',
    });
  }
};
