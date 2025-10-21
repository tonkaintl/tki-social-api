/**
 * Campaign Proposed Posts Media Controller
 * Replace all media for specific proposed post platform
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

const replaceProposedPostMediaParamsSchema = z.object({
  platform: z.enum(SUPPORTED_PROVIDERS, {
    errorMap: () => ({ message: 'Invalid platform' }),
  }),
  stockNumber: z.string().min(1, 'Stock number is required'),
});

const mediaObjectSchema = z.object({
  alt: z.string().optional(),
  description: z.string().optional(),
  filename: z.string().optional(),
  media_type: z.enum(MEDIA_TYPE_VALUES).default('image'),
  size: z.number().optional(),
  tags: z.array(z.string()).optional(),
  url: z.string().url('Invalid URL format'),
});

const replaceProposedPostMediaBodySchema = z.object({
  media_urls: z.array(mediaObjectSchema),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Replace All Media in Proposed Post
 * PUT /campaigns/:stockNumber/proposed-posts/:platform/media
 */
export const replaceProposedPostMedia = async (req, res) => {
  try {
    const { platform, stockNumber } =
      replaceProposedPostMediaParamsSchema.parse(req.params);
    const { media_urls } = replaceProposedPostMediaBodySchema.parse(req.body);

    logger.info('Replacing all media in proposed post', {
      mediaCount: media_urls.length,
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

    // Check if proposed post exists for this platform
    const proposedPostExists = campaign.proposed_posts.some(
      post => post.platform === platform
    );

    if (!proposedPostExists) {
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

    // Add timestamps to media objects
    const timestampedMediaUrls = media_urls.map(media => ({
      ...media,
      created_at: new Date(),
    }));

    // Log before update for debugging
    logger.info(
      `Before media update - Platform: ${platform}, Stock: ${stockNumber}, Media Count: ${media_urls.length}`
    );

    // Replace all media in the proposed post
    const updatedCampaign = await SocialCampaigns.findOneAndUpdate(
      {
        'proposed_posts.platform': platform,
        stock_number: stockNumber,
      },
      {
        $set: {
          'proposed_posts.$.media_urls': timestampedMediaUrls,
          updated_at: new Date(),
        },
      },
      {
        new: true,
        projection: { proposed_posts: 1, stock_number: 1, title: 1 },
      }
    );

    // Log after update for debugging
    const platformSummary = updatedCampaign.proposed_posts
      .map(p => `${p.platform}:${p.media_urls?.length || 0}`)
      .join(', ');
    logger.info(`After media update - All platforms: [${platformSummary}]`);

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
      },
      message: 'Media replaced in proposed post successfully',
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
      logger.error('Database error in replaceProposedPostMedia', {
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
    logger.error('Unexpected error in replaceProposedPostMedia', {
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
