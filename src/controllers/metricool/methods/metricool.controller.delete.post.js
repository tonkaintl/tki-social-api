// ----------------------------------------------------------------------------
// DELETE /metricool/posts/:postId
// Delete a draft or scheduled post from Metricool (only allowed for drafts/scheduled)
// ----------------------------------------------------------------------------

import { MetricoolClient } from '../../../adapters/metricool/metricool.client.js';
import { config } from '../../../config/env.js';
import { METRICOOL_STATUS } from '../../../constants/campaigns.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Delete a draft or scheduled post from Metricool
 * DELETE /metricool/posts/:postId
 */
export const deleteMetricoolPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { stockNumber } = req.query; // Optional campaign association

    // Find the campaign and proposed post with this Metricool ID
    const filter = {
      'proposed_posts.metricool_id': postId,
    };
    if (stockNumber) {
      filter.stock_number = stockNumber;
    }

    const campaign = await SocialCampaigns.findOne(filter);
    if (!campaign) {
      throw new ApiError(
        stockNumber
          ? 'Campaign or Metricool post not found'
          : 'Metricool post not found in any campaign',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404
      );
    }

    const proposedPost = campaign.proposed_posts.find(
      post => post.metricool_id === postId
    );
    if (!proposedPost) {
      throw new ApiError(
        'Proposed post not found',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404
      );
    }

    // Only allow deletion of posts with PENDING status
    // (Metricool uses PENDING for both drafts and scheduled posts)
    if (proposedPost.metricool_status !== METRICOOL_STATUS.PENDING) {
      throw new ApiError(
        `Cannot delete post with status '${proposedPost.metricool_status}'. Only posts with PENDING status can be deleted.`,
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // Initialize Metricool client
    const metricoolClient = new MetricoolClient(config);

    logger.info('Deleting Metricool post', {
      metricoolPostId: postId,
      platform: proposedPost.platform,
      status: proposedPost.metricool_status,
      stockNumber: campaign.stock_number,
    });

    try {
      // Delete from Metricool first (note: Metricool uses the post ID, not UUID for deletion)
      await metricoolClient.deletePost(postId);

      logger.info('Successfully deleted post from Metricool', {
        metricoolPostId: postId,
        stockNumber: campaign.stock_number,
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
            metricoolPostId: postId,
            stockNumber: campaign.stock_number,
          }
        );
      } else {
        // For other Metricool errors, provide detailed error information
        const errorDetails = {
          errorData: metricoolError.data || metricoolError.response?.data,
          errorMessage: metricoolError.message || 'Unknown Metricool API error',
          metricoolPostId: postId,
          statusCode:
            metricoolError.statusCode || metricoolError.response?.status,
          stockNumber: campaign.stock_number,
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
            metricoolError: metricoolError.message,
            metricoolPostId: postId,
            stockNumber: campaign.stock_number,
          }
        );
      }
    }

    // Remove Metricool tracking from the proposed post
    const updateResult = await SocialCampaigns.updateOne(
      {
        'proposed_posts.metricool_id': postId,
        stock_number: campaign.stock_number,
      },
      {
        $unset: {
          'proposed_posts.$.metricool_created_at': '',
          'proposed_posts.$.metricool_id': '',
          'proposed_posts.$.metricool_scheduled_date': '',
          'proposed_posts.$.metricool_status': '',
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      logger.warn('Failed to clear Metricool tracking from proposed post', {
        metricoolPostId: postId,
        stockNumber: campaign.stock_number,
      });
    }

    logger.info('Metricool post deleted successfully', {
      metricoolPostId: postId,
      stockNumber: campaign.stock_number,
    });

    // Return success response
    res.status(200).json({
      data: {
        deletedPostId: postId,
        platform: proposedPost.platform,
        status: proposedPost.metricool_status,
        stockNumber: campaign.stock_number,
      },
      message: 'Post deleted successfully from Metricool and campaign',
    });
  } catch (error) {
    logger.error('Failed to delete Metricool post', {
      error: error.message,
      postId: req.params.postId,
      stack: error.stack,
      stockNumber: req.query.stockNumber || 'unassociated',
    });

    // Pass to error handler
    next(error);
  }
};
