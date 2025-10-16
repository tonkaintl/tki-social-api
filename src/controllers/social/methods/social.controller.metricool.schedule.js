// ----------------------------------------------------------------------------
// PATCH /social/campaigns/:campaignId/metricool/:postId/schedule
// Schedule a draft post in Metricool for publishing
// ----------------------------------------------------------------------------

import { z } from 'zod';

import { MetricoolClient } from '../../../adapters/metricool/metricool.client.js';
import { config } from '../../../config/env.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// Request validation schema
const scheduleMetricoolPostSchema = z.object({
  publish_datetime: z
    .string()
    .datetime('Invalid publish datetime format')
    .refine(
      date => new Date(date) > new Date(),
      'Publish datetime must be in the future'
    ),
});

/**
 * Schedule a draft post in Metricool for publishing
 * PATCH /social/campaigns/:campaignId/metricool/:postId/schedule
 */
export const scheduleMetricoolPost = async (req, res, next) => {
  try {
    const { campaignId, postId } = req.params;

    // Validate request body
    const validationResult = scheduleMetricoolPostSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      logger.warn('Metricool schedule validation failed', {
        campaignId,
        errors: validationResult.error.errors,
        postId,
      });

      throw new ApiError(
        `Validation failed: ${errorMessage}`,
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    const { publish_datetime } = validationResult.data;

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

    // Find the Metricool post in the campaign
    const metricoolPost = campaign.metricoolPosts?.find(
      post => post.id === postId
    );
    if (!metricoolPost) {
      throw new ApiError(
        'Metricool post not found in campaign',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404
      );
    }

    // Initialize Metricool client
    const metricoolClient = new MetricoolClient(config);

    // Update the post to scheduled status
    const updatePayload = {
      publish_datetime,
      status: 'scheduled',
    };

    logger.info('Scheduling Metricool post', {
      campaignId,
      postId,
      publishDate: publish_datetime,
    });

    await metricoolClient.updatePost(postId, updatePayload);

    // Update campaign with new status
    metricoolPost.publishDate = publish_datetime;
    metricoolPost.status = 'scheduled';
    metricoolPost.updatedAt = new Date();

    // Update campaign status if needed
    if (campaign.status === 'draft' || campaign.status === 'pending_approval') {
      campaign.status = 'scheduled';
    }

    await campaign.save();

    logger.info('Metricool post scheduled successfully', {
      campaignId,
      postId,
      publishDate: publish_datetime,
    });

    // Return success response
    res.status(200).json({
      data: {
        campaignId,
        metricoolDashboardUrl: `https://app.metricool.com/evolution/web?blogId=${config.METRICOOL_BLOG_ID}&userId=${config.METRICOOL_USER_ID}`,
        metricoolPost: {
          id: postId,
          network: metricoolPost.network,
          publishDate: publish_datetime,
          status: 'scheduled',
        },
      },
      message: 'Post scheduled successfully in Metricool',
    });
  } catch (error) {
    logger.error('Failed to schedule Metricool post', {
      campaignId: req.params.campaignId,
      error: error.message,
      postId: req.params.postId,
      stack: error.stack,
    });

    // Pass to error handler
    next(error);
  }
};
