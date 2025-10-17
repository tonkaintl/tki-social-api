// ----------------------------------------------------------------------------
// DELETE /social/campaigns/:campaignId/metricool/:postId
// Delete a draft or scheduled post from Metricool (only allowed for drafts/scheduled)
// ----------------------------------------------------------------------------

import { MetricoolClient } from '../../../adapters/metricool/metricool.client.js';
import { config } from '../../../config/env.js';
import { CAMPAIGN_STATUS } from '../../../constants/campaigns.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import MetricoolPosts from '../../../models/metricoolPosts.model.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Delete a draft or scheduled post from Metricool
 * DELETE /social/campaigns/:campaignId/metricool/:postId
 */
export const deleteMetricoolPost = async (req, res, next) => {
  try {
    const { campaignId, postId } = req.params;

    // Check if campaign exists
    const campaign = await SocialCampaigns.findOne({
      stock_number: campaignId,
    });
    if (!campaign) {
      throw new ApiError(
        'Campaign not found',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404
      );
    }

    // Find the Metricool post
    const metricoolPost = await MetricoolPosts.findOne({
      metricool_id: postId,
      stock_number: campaignId,
    });
    if (!metricoolPost) {
      throw new ApiError(
        'Metricool post not found',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404
      );
    }

    // Only allow deletion of draft or scheduled posts
    if (
      metricoolPost.status !== CAMPAIGN_STATUS.DRAFT &&
      metricoolPost.status !== CAMPAIGN_STATUS.SCHEDULED
    ) {
      throw new ApiError(
        `Cannot delete post with status '${metricoolPost.status}'. Only draft and scheduled posts can be deleted.`,
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // Initialize Metricool client
    const metricoolClient = new MetricoolClient(config);

    logger.info('Deleting Metricool post', {
      campaignId,
      metricoolPostId: postId,
      postUuid: metricoolPost.uuid,
      status: metricoolPost.status,
    });

    try {
      // Delete from Metricool first (note: Metricool uses the post ID, not UUID for deletion)
      await metricoolClient.deletePost(postId);

      logger.info('Successfully deleted post from Metricool', {
        campaignId,
        metricoolPostId: postId,
      });
    } catch (metricoolError) {
      // If post doesn't exist in Metricool (404), that's OK - continue with DB cleanup
      if (
        metricoolError.response?.status === 404 ||
        metricoolError.statusCode === 404
      ) {
        logger.warn(
          'Post not found in Metricool, continuing with database cleanup',
          {
            campaignId,
            metricoolPostId: postId,
          }
        );
      } else {
        // For other Metricool errors, provide detailed error information
        const errorDetails = {
          campaignId,
          errorData: metricoolError.data || metricoolError.response?.data,
          errorMessage: metricoolError.message || 'Unknown Metricool API error',
          metricoolPostId: postId,
          statusCode:
            metricoolError.statusCode || metricoolError.response?.status,
        };

        logger.error('Failed to delete post from Metricool', errorDetails);

        // Provide a more descriptive error message
        const errorMsg = metricoolError.message
          ? `Metricool API error: ${metricoolError.message}`
          : `Metricool API returned status ${errorDetails.statusCode || 'unknown'}`;

        throw new ApiError(
          errorMsg,
          ERROR_CODES.EXTERNAL_API_ERROR,
          errorDetails.statusCode || 500,
          {
            campaignId,
            metricoolError: metricoolError.message,
            metricoolPostId: postId,
          }
        );
      }
    }

    // Remove from our database
    await MetricoolPosts.deleteOne({
      metricool_id: postId,
      stock_number: campaignId,
    });

    logger.info('Metricool post deleted successfully', {
      campaignId,
      metricoolPostId: postId,
    });

    // Return success response
    res.status(200).json({
      data: {
        campaignId,
        deletedPostId: postId,
        status: metricoolPost.status,
      },
      message: 'Post deleted successfully from Metricool and database',
    });
  } catch (error) {
    logger.error('Failed to delete Metricool post', {
      campaignId: req.params.campaignId,
      error: error.message,
      postId: req.params.postId,
      stack: error.stack,
    });

    // Pass to error handler
    next(error);
  }
};
