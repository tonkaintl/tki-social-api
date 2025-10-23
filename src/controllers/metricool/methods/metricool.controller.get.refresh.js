import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { syncMetricoolPosts } from '../../../services/metricool.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * Refresh Metricool post data to sync with changes made directly in Metricool
 * GET /metricool/refresh/:stockNumber
 */
export const refreshMetricoolPosts = async (req, res, next) => {
  try {
    const { stockNumber } = req.params;

    // Check if campaign exists
    const campaign = await SocialCampaigns.findOne({
      stock_number: stockNumber,
    });
    if (!campaign) {
      throw new ApiError(
        'Campaign not found',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404
      );
    }

    // Get proposed posts for this campaign that have Metricool IDs
    const metricoolPosts = campaign.proposed_posts.filter(
      post => post.metricool_id
    );

    if (metricoolPosts.length === 0) {
      return res.status(200).json({
        data: {
          postsDeleted: 0,
          postsRefreshed: 0,
          postsUpdated: 0,
          stockNumber: stockNumber,
        },
        message: 'No Metricool posts found for this campaign',
      });
    }

    // Use shared metricool service for sync functionality
    const syncResults = await syncMetricoolPosts({
      stockNumber: stockNumber,
    });

    // Return success response
    res.status(200).json({
      data: {
        postsDeleted: syncResults.postsDeleted,
        postsRefreshed: metricoolPosts.length,
        postsUpdated: syncResults.postsUpdated,
        refreshResults: syncResults.details,
        stockNumber: stockNumber,
      },
      message: `Refreshed ${metricoolPosts.length} posts: ${syncResults.postsUpdated} updated, ${syncResults.postsDeleted} deleted`,
    });
  } catch (error) {
    logger.error('Failed to refresh Metricool posts', {
      error: error.message,
      stack: error.stack,
      stockNumber: req.params.stockNumber,
    });

    // Pass to error handler
    next(error);
  }
};
