/**
 * Social Campaign Proposed Posts Controller
 * Manage proposed posts for each platform before sending to Metricool
 */

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import {
  generateMultiPlatformContent,
  SUPPORTED_PROVIDERS,
} from '../../../utils/contentGeneration.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const updateProposedPostsParamsSchema = z.object({
  stockNumber: z.string().min(1, 'Stock number is required'),
});

const updateProposedPostsBodySchema = z.object({
  platforms: z.array(z.enum(SUPPORTED_PROVIDERS)),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Update Proposed Posts
 * PATCH /campaigns/:stockNumber/proposed-posts
 */
export const addProposedPosts = async (req, res) => {
  try {
    // Validate parameters and body
    const paramsValidation = updateProposedPostsParamsSchema.safeParse(
      req.params
    );
    const bodyValidation = updateProposedPostsBodySchema.safeParse(req.body);

    if (!paramsValidation.success) {
      logger.warn('Invalid proposed posts update parameters', {
        errors: paramsValidation.error.errors,
        params: req.params,
        requestId: req.requestId,
      });
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        ERROR_MESSAGES.INVALID_REQUEST_PARAMS,
        400,
        paramsValidation.error.errors
      );
      return res.status(error.statusCode).json({
        code: error.code,
        details: error.details,
        error: error.message,
      });
    }

    if (!bodyValidation.success) {
      logger.warn('Invalid proposed posts update body', {
        body: req.body,
        errors: bodyValidation.error.errors,
        requestId: req.requestId,
      });
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        400,
        bodyValidation.error.errors
      );
      return res.status(error.statusCode).json({
        code: error.code,
        details: error.details,
        error: error.message,
      });
    }

    const { stockNumber } = paramsValidation.data;
    const { platforms } = bodyValidation.data;

    logger.info('Generating proposed posts', {
      platformCount: platforms.length,
      platforms,
      requestId: req.requestId,
      stockNumber,
    });

    // Step 1: Find existing campaign
    const existingCampaign = await SocialCampaigns.findOne({
      stock_number: stockNumber,
    });

    if (!existingCampaign) {
      logger.warn('Campaign not found for proposed posts update', {
        requestId: req.requestId,
        stockNumber,
      });
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

    // Step 2: Generate content for all requested platforms
    const { platformContent } = await generateMultiPlatformContent(
      stockNumber,
      platforms,
      existingCampaign.base_message
    );

    // Step 3: Create proposed_posts array from generated content
    // Explicitly set all schema fields for clarity
    const proposed_posts = platforms.map(platform => ({
      draft: true, // New posts start as drafts until sent to Metricool
      enabled: true, // Posts are enabled by default
      media_urls: [], // Will be populated later by staff
      metricool_created_at: null, // Not sent to Metricool yet
      metricool_id: null, // Not sent to Metricool yet
      metricool_scheduled_date: null, // Not sent to Metricool yet
      metricool_status: null, // Not sent to Metricool yet
      platform, // Platform identifier (meta, linkedin, x, reddit)
      scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to 24 hours from now
      text: platformContent[platform] || `Generated content for ${platform}`,
    }));

    // Step 4: Update campaign with proposed posts
    const updatedCampaign = await SocialCampaigns.findOneAndUpdate(
      { stock_number: stockNumber },
      {
        $set: {
          proposed_posts: proposed_posts,
          updated_at: new Date(),
        },
      },
      {
        new: true,
      }
    );

    logger.info('Proposed posts generated and saved successfully', {
      platformCount: proposed_posts.length,
      platforms,
      requestId: req.requestId,
      stockNumber,
    });

    // Format response with proposed_posts at top level for easier frontend access
    const response = {
      campaign: updatedCampaign,
      message: 'Proposed posts generated successfully',
      proposed_posts: updatedCampaign.proposed_posts, // Make proposed_posts easily accessible
      stock_number: stockNumber,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error updating proposed posts', {
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
      message: 'Failed to update proposed posts',
    });
  }
};
