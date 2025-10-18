/**
 * Campaign Proposed Posts Media Controller
 * Add media to specific proposed post platform
 */

import { z } from 'zod';

import { MEDIA_TYPE_VALUES } from '../../../constants/campaigns.js';
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

const addProposedPostMediaParamsSchema = z.object({
  platform: z.enum(SUPPORTED_PROVIDERS, {
    errorMap: () => ({ message: 'Invalid platform' }),
  }),
  stockNumber: z.string().min(1, 'Stock number is required'),
});

const addProposedPostMediaBodySchema = z.object({
  alt: z.string().optional(),
  description: z.string().optional(),
  filename: z.string().optional(),
  media_type: z.enum(MEDIA_TYPE_VALUES).default('image'),
  size: z.number().optional(),
  tags: z.array(z.string()).optional(),
  url: z.string().url('Invalid URL format'),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Add Media to Proposed Post
 * PATCH /campaigns/:stockNumber/proposed-posts/:platform/media
 */
export const addProposedPostMedia = async (req, res) => {
  try {
    const { platform, stockNumber } = addProposedPostMediaParamsSchema.parse(
      req.params
    );
    const mediaData = addProposedPostMediaBodySchema.parse(req.body);

    logger.info('Adding media to proposed post', {
      mediaUrl: mediaData.url,
      platform,
      stockNumber,
    });

    // Find the campaign
    const campaign = await SocialCampaigns.findOne({
      stock_number: stockNumber,
    });

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

    // Create media object with timestamp
    const mediaObject = {
      ...mediaData,
      created_at: new Date(),
    };

    // Find the proposed post for this platform
    const proposedPostIndex = campaign.proposed_posts.findIndex(
      post => post.platform === platform
    );

    if (proposedPostIndex === -1) {
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

    // Add media to the proposed post
    const updatedCampaign = await SocialCampaigns.findOneAndUpdate(
      {
        'proposed_posts.platform': platform,
        stock_number: stockNumber,
      },
      {
        $addToSet: {
          'proposed_posts.$.media_urls': mediaObject,
        },
        $set: { updated_at: new Date() },
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
        added_media: mediaObject,
        campaign: {
          stock_number: updatedCampaign.stock_number,
          title: updatedCampaign.title,
        },
        proposed_post: {
          media_count: updatedProposedPost.media_urls.length,
          media_urls: updatedProposedPost.media_urls,
          platform: updatedProposedPost.platform,
        },
      },
      message: 'Media added to proposed post successfully',
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
      logger.error('Database error in addProposedPostMedia', {
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
    logger.error('Unexpected error in addProposedPostMedia', {
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
