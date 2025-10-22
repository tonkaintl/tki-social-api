/**
 * Campaign Proposed Posts Delete Controller
 * Delete specific platforms from proposed posts array
 */

import { z } from 'zod';

import { MetricoolClient } from '../../../adapters/metricool/metricool.client.js';
import { config } from '../../../config/env.js';
import { METRICOOL_STATUS } from '../../../constants/campaigns.js';
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

    // Identify posts to delete and check if they need Metricool deletion
    const postsToDelete = existingCampaign.proposed_posts.filter(post =>
      platforms.includes(post.platform)
    );

    if (postsToDelete.length === 0) {
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

    // Attempt to delete from Metricool if posts have metricool_id and are draft/scheduled
    const metricoolClient = new MetricoolClient(config);
    const metricoolDeletionResults = [];

    for (const post of postsToDelete) {
      // Only delete from Metricool if:
      // 1. Post has a metricool_id
      // 2. Post status is PENDING (Metricool uses PENDING for drafts/scheduled)
      if (
        post.metricool_id &&
        post.metricool_status === METRICOOL_STATUS.PENDING
      ) {
        try {
          logger.info('Attempting to delete post from Metricool', {
            metricoolId: post.metricool_id,
            platform: post.platform,
            requestId: req.requestId,
            status: post.metricool_status,
            stockNumber,
          });

          await metricoolClient.deletePost(post.metricool_id);

          metricoolDeletionResults.push({
            metricool_id: post.metricool_id,
            platform: post.platform,
            success: true,
          });

          logger.info('Successfully deleted post from Metricool', {
            metricoolId: post.metricool_id,
            platform: post.platform,
            requestId: req.requestId,
            stockNumber,
          });
        } catch (error) {
          // Log error but don't fail the entire operation
          // Post may already be deleted or not exist in Metricool
          logger.warn('Failed to delete post from Metricool (non-fatal)', {
            error: error.message,
            metricoolId: post.metricool_id,
            platform: post.platform,
            requestId: req.requestId,
            stockNumber,
          });

          metricoolDeletionResults.push({
            error: error.message,
            metricool_id: post.metricool_id,
            platform: post.platform,
            success: false,
          });
        }
      } else {
        logger.info('Skipping Metricool deletion for post', {
          hasMetricoolId: !!post.metricool_id,
          metricoolStatus: post.metricool_status,
          platform: post.platform,
          reason: !post.metricool_id
            ? 'No metricool_id'
            : 'Status not draft/scheduled',
          requestId: req.requestId,
          stockNumber,
        });
      }
    }

    // Filter out the specified platforms from proposed_posts
    const originalCount = existingCampaign.proposed_posts.length;
    const updatedProposedPosts = existingCampaign.proposed_posts.filter(
      post => !platforms.includes(post.platform)
    );
    const deletedCount = originalCount - updatedProposedPosts.length;

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

    const metricoolDeletedCount = metricoolDeletionResults.filter(
      r => r.success
    ).length;
    const metricoolFailedCount = metricoolDeletionResults.filter(
      r => !r.success
    ).length;

    logger.info('Proposed posts deleted successfully', {
      deletedCount,
      deletedPlatforms: platforms,
      metricoolDeletedCount,
      metricoolFailedCount,
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
      metricool_deletion: {
        attempted: metricoolDeletionResults.length,
        failed: metricoolFailedCount,
        results: metricoolDeletionResults,
        successful: metricoolDeletedCount,
      },
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
