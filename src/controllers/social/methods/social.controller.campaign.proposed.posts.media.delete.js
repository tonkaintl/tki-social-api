/**
 * Campaign Proposed Posts Media Controller
 * Remove media from specific proposed post platform
 */

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import { SUPPORTED_PROVIDERS } from '../../../constants/providers.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const removeProposedPostMediaParamsSchema = z.object({
  mediaIndex: z.string().transform(val => parseInt(val, 10)),
  platform: z.enum(SUPPORTED_PROVIDERS, {
    errorMap: () => ({ message: 'Invalid platform' }),
  }),
  stockNumber: z.string().min(1, 'Stock number is required'),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Remove Media from Proposed Post
 * DELETE /campaigns/:stockNumber/proposed-posts/:platform/media/:mediaIndex
 */
export const removeProposedPostMedia = async (req, res) => {
  try {
    const { mediaIndex, platform, stockNumber } =
      removeProposedPostMediaParamsSchema.parse(req.params);

    logger.info('Removing media from proposed post', {
      mediaIndex,
      platform,
      stockNumber,
    });

    // Find the campaign and get the specific proposed post
    const campaign = await SocialCampaigns.findOne(
      { stock_number: stockNumber },
      { proposed_posts: 1 }
    );

    if (!campaign) {
      const error = new ApiError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        ERROR_MESSAGES.CAMPAIGN_NOT_FOUND
      );
      return res.status(error.statusCode).json({
        error: error.message,
        request_id: req.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Find the proposed post for this platform
    const proposedPost = campaign.proposed_posts.find(
      post => post.platform === platform
    );

    if (!proposedPost) {
      const error = new ApiError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        `Proposed post for platform '${platform}' not found`
      );
      return res.status(error.statusCode).json({
        error: error.message,
        request_id: req.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Validate media index
    if (
      !proposedPost.media_urls ||
      mediaIndex >= proposedPost.media_urls.length ||
      mediaIndex < 0
    ) {
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        `Invalid media index: ${mediaIndex}`
      );
      return res.status(error.statusCode).json({
        error: error.message,
        request_id: req.id,
        timestamp: new Date().toISOString(),
      });
    }

    const removedMediaUrl = proposedPost.media_urls[mediaIndex];

    // Create updated media array without the specified index
    const updatedMediaUrls = proposedPost.media_urls.filter(
      (_, index) => index !== mediaIndex
    );

    // Update the campaign
    const updatedCampaign = await SocialCampaigns.findOneAndUpdate(
      {
        'proposed_posts.platform': platform,
        stock_number: stockNumber,
      },
      {
        $set: {
          'proposed_posts.$.media_urls': updatedMediaUrls,
          updated_at: new Date(),
        },
      },
      {
        new: true,
        projection: { proposed_posts: 1, stock_number: 1, title: 1 },
      }
    );

    const updatedProposedPost = updatedCampaign.proposed_posts.find(
      post => post.platform === platform
    );

    // Success response
    return res.status(200).json({
      data: {
        campaign: {
          stock_number: updatedCampaign.stock_number,
          title: updatedCampaign.title,
        },
        proposed_post: {
          media_count: updatedProposedPost.media_urls.length,
          media_urls: updatedProposedPost.media_urls,
          platform: updatedProposedPost.platform,
        },
        removed_media: removedMediaUrl,
      },
      message: 'Media removed from proposed post successfully',
      request_id: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Validation error handling
    if (error.name === 'ZodError') {
      const validationError = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request data',
        error.errors
      );
      return res.status(validationError.statusCode).json({
        details: validationError.details,
        error: validationError.message,
        request_id: req.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Database error handling
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      const dbError = new ApiError(
        ERROR_CODES.DATABASE_ERROR,
        ERROR_MESSAGES.DATABASE_ERROR
      );
      logger.error('Database error in removeProposedPostMedia', {
        error: error.message,
        params: req.params,
      });
      return res.status(dbError.statusCode).json({
        error: dbError.message,
        request_id: req.id,
        timestamp: new Date().toISOString(),
      });
    }

    // Generic error handling
    logger.error('Unexpected error in removeProposedPostMedia', {
      error: error.message,
      params: req.params,
      stack: error.stack,
    });

    const genericError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
    return res.status(genericError.statusCode).json({
      error: genericError.message,
      request_id: req.id,
      timestamp: new Date().toISOString(),
    });
  }
};
