/**
 * Social Campaign Detail Controller
 * Retrieves individual campaign details by stock number
 */

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const getCampaignParamsSchema = z.object({
  stockNumber: z.string().min(1, 'Stock number is required'),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Get Campaign by Stock Number
 * GET /social/campaigns/:stockNumber
 */
export const getCampaignByStockNumber = async (req, res) => {
  try {
    // Validate parameters
    const validation = getCampaignParamsSchema.safeParse(req.params);
    if (!validation.success) {
      logger.warn('Invalid campaign detail request', {
        errors: validation.error.errors,
        params: req.params,
        requestId: req.requestId,
      });
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request parameters',
        400,
        validation.error.errors
      );
      return res.status(error.statusCode).json({
        code: error.code,
        details: error.details,
        error: error.message,
      });
    }

    const { stockNumber } = validation.data;

    logger.info('Fetching campaign details', {
      requestId: req.requestId,
      stockNumber,
    });

    // Find campaign by stock number
    const campaign = await SocialCampaigns.findOne(
      { stock_number: stockNumber },
      {
        // Include all fields but limit posts to essential data
        'posts.platform_response': 0, // Exclude large response data
      }
    );

    if (!campaign) {
      logger.warn('Campaign not found', {
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

    // Format response
    const response = {
      campaign: {
        campaign_id: campaign.campaign_id,
        created_at: campaign.created_at,
        inventory_data: campaign.inventory_data,
        metadata: {
          failed_count: campaign.posts.filter(p => p.status === 'failed')
            .length,
          posted_count: campaign.posts.filter(p => p.status === 'posted')
            .length,
          total_posts: campaign.posts.length,
        },
        platform_content: campaign.platform_content,
        posts: campaign.posts.map(post => ({
          engagement: post.engagement,
          platform: post.platform,
          post_id: post.post_id,
          posted_at: post.posted_at,
          status: post.status,
        })),
        status: campaign.status,
        stock_number: campaign.stock_number,
        updated_at: campaign.updated_at,
      },
    };

    logger.info('Campaign details retrieved successfully', {
      requestId: req.requestId,
      stockNumber,
      totalPosts: response.campaign.metadata.total_posts,
    });

    res.json(response);
  } catch (error) {
    logger.error('Error fetching campaign details', {
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
      message: 'Failed to fetch campaign details',
    });
  }
};
