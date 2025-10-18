// ----------------------------------------------------------------------------
// PATCH /social/campaigns/:campaignId/metricool/:postId/schedule
// Schedule a draft post in Metricool for publishing
// ----------------------------------------------------------------------------

import { z } from 'zod';

import { MetricoolClient } from '../../../adapters/metricool/metricool.client.js';
import { config } from '../../../config/env.js';
import { CAMPAIGN_STATUS } from '../../../constants/campaigns.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import MetricoolPosts from '../../../models/metricoolPosts.model.js';
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
    const { postId, stockNumber } = req.params;

    // Validate request body
    const validationResult = scheduleMetricoolPostSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      logger.warn('Metricool schedule validation failed', {
        campaignId: stockNumber,
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
      stock_number: stockNumber,
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
      stock_number: stockNumber,
    });
    if (!metricoolPost) {
      throw new ApiError(
        'Metricool post not found',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404
      );
    }

    // Only allow scheduling of draft posts
    if (metricoolPost.status !== CAMPAIGN_STATUS.DRAFT) {
      throw new ApiError(
        `Cannot schedule post with status '${metricoolPost.status}'. Only draft posts can be scheduled.`,
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // Initialize Metricool client
    const metricoolClient = new MetricoolClient(config);

    logger.info('Scheduling Metricool post', {
      campaignId: stockNumber,
      postId,
      publishDate: publish_datetime,
    });

    // Update the post in Metricool (using UUID for updates)
    await metricoolClient.updatePost(metricoolPost.uuid, {
      publish_datetime,
    });

    // Update our database record with correct field names
    metricoolPost.publication_date = {
      date_time: publish_datetime,
      timezone: 'UTC',
    };
    metricoolPost.status = CAMPAIGN_STATUS.SCHEDULED;
    metricoolPost.updated_at = new Date();
    await metricoolPost.save();

    // Update campaign status if needed
    if (
      campaign.status === CAMPAIGN_STATUS.DRAFT ||
      campaign.status === CAMPAIGN_STATUS.PENDING
    ) {
      campaign.status = CAMPAIGN_STATUS.SCHEDULED;
      await campaign.save();
    }

    logger.info('Metricool post scheduled successfully', {
      campaignId: stockNumber,
      postId,
      publishDate: publish_datetime,
    });

    // Return success response
    res.status(200).json({
      data: {
        campaignId: stockNumber,
        metricoolDashboardUrl: `https://app.metricool.com/evolution/web?blogId=${config.METRICOOL_BLOG_ID}&userId=${config.METRICOOL_USER_ID}`,
        metricoolPost: {
          id: postId,
          providers: metricoolPost.providers || [],
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
