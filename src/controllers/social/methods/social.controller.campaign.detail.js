/**
 * Social Campaign Detail Controller
 * Retrieves individual campaign details by stock number
 */

import { z } from 'zod';

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
      return res.status(400).json({
        details: validation.error.errors,
        error: 'Invalid request parameters',
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
      return res.status(404).json({
        error: 'Campaign not found',
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

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch campaign details',
    });
  }
};
