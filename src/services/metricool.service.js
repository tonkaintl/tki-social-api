// ----------------------------------------------------------------------------
// Metricool Service - Shared logic for syncing Metricool posts
// ----------------------------------------------------------------------------

import { MetricoolClient } from '../adapters/metricool/metricool.client.js';
import { config } from '../config/env.js';
import { CAMPAIGN_STATUS } from '../constants/campaigns.js';
import { ApiError, ERROR_CODES } from '../constants/errors.js';
import SocialCampaigns from '../models/socialCampaigns.model.js';
import { logger } from '../utils/logger.js';

/**
 * Sync Metricool posts status back to campaign proposed posts
 * @param {Object} options - Sync options
 * @param {string|null} options.stockNumber - Stock number to filter by (null for all campaigns)
 * @returns {Object} Sync results with counts and details
 */
export const syncMetricoolPosts = async (options = {}) => {
  const { stockNumber = null } = options;

  logger.info('Starting Metricool posts sync', {
    stockNumber: stockNumber || 'all',
  });

  // Initialize Metricool client
  const metricoolClient = new MetricoolClient(config);

  // Get all posts from Metricool API
  const allMetricoolPosts =
    await metricoolClient.getAllScheduledAndDraftPosts();

  if (!allMetricoolPosts || !allMetricoolPosts.data) {
    throw new ApiError(
      'Failed to retrieve posts from Metricool',
      ERROR_CODES.EXTERNAL_API_ERROR,
      500
    );
  }

  // Create a map of Metricool posts by ID for efficient lookup
  const metricoolPostsMap = new Map();
  allMetricoolPosts.data.forEach(post => {
    metricoolPostsMap.set(post.id.toString(), post);
  });

  // Get campaigns with proposed posts that have Metricool IDs
  const filter = {
    'proposed_posts.metricool_id': { $exists: true, $ne: null },
  };
  if (stockNumber) {
    filter.stock_number = stockNumber;
  }

  const campaigns = await SocialCampaigns.find(filter);

  const syncResults = {
    campaignsProcessed: 0,
    details: [],
    errors: 0,
    postsDeleted: 0,
    postsUpdated: 0,
  };

  logger.info('Syncing Metricool posts to campaigns', {
    campaignsFound: campaigns.length,
    metricoolPostsCount: allMetricoolPosts.data.length,
    stockNumber: stockNumber || 'all',
  });

  // Process each campaign
  for (const campaign of campaigns) {
    try {
      let campaignUpdated = false;

      // Check each proposed post that has a Metricool ID
      for (const proposedPost of campaign.proposed_posts) {
        if (!proposedPost.metricool_id) continue;

        const metricoolData = metricoolPostsMap.get(proposedPost.metricool_id);

        if (!metricoolData) {
          // Post no longer exists in Metricool - mark as failed
          proposedPost.metricool_status = CAMPAIGN_STATUS.FAILED;
          campaignUpdated = true;
          syncResults.postsDeleted++;

          syncResults.details.push({
            action: 'deleted',
            metricool_id: proposedPost.metricool_id,
            platform: proposedPost.platform,
            reason: 'Post not found in Metricool',
            stock_number: campaign.stock_number,
          });

          logger.debug('Marked proposed post as failed', {
            metricool_id: proposedPost.metricool_id,
            platform: proposedPost.platform,
            stock_number: campaign.stock_number,
          });
          continue;
        }

        // Determine current status from Metricool data
        let currentStatus = CAMPAIGN_STATUS.DRAFT;
        if (metricoolData.published) {
          currentStatus = CAMPAIGN_STATUS.PUBLISHED;
        } else if (metricoolData.scheduled && !metricoolData.draft) {
          currentStatus = CAMPAIGN_STATUS.SCHEDULED;
        }

        // Check if status changed
        if (proposedPost.metricool_status !== currentStatus) {
          proposedPost.metricool_status = currentStatus;
          campaignUpdated = true;
          syncResults.postsUpdated++;

          syncResults.details.push({
            action: 'updated',
            metricool_id: proposedPost.metricool_id,
            newStatus: currentStatus,
            oldStatus: proposedPost.metricool_status,
            platform: proposedPost.platform,
            stock_number: campaign.stock_number,
          });

          logger.debug('Updated proposed post status', {
            metricool_id: proposedPost.metricool_id,
            newStatus: currentStatus,
            platform: proposedPost.platform,
            stock_number: campaign.stock_number,
          });
        }

        // Update scheduled date if different
        if (metricoolData.publicationDate?.dateTime) {
          const metricoolDate = new Date(
            metricoolData.publicationDate.dateTime
          );
          if (
            !proposedPost.metricool_scheduled_date ||
            proposedPost.metricool_scheduled_date.getTime() !==
              metricoolDate.getTime()
          ) {
            proposedPost.metricool_scheduled_date = metricoolDate;
            campaignUpdated = true;
          }
        }
      }

      // Save campaign if any proposed posts were updated
      if (campaignUpdated) {
        campaign.updated_at = new Date();
        await campaign.save();
        syncResults.campaignsProcessed++;
      }
    } catch (error) {
      syncResults.errors++;
      syncResults.details.push({
        action: 'error',
        error: error.message,
        stock_number: campaign.stock_number,
      });

      logger.error('Failed to sync campaign', {
        error: error.message,
        stock_number: campaign.stock_number,
      });
    }
  }

  logger.info('Metricool sync completed', {
    stockNumber: stockNumber || 'all',
    ...syncResults,
    totalDetails: syncResults.details.length,
  });

  return syncResults;
};

/**
 * Test Metricool API connection
 * @returns {Object} Connection test result
 */
export const testMetricoolConnection = async () => {
  const metricoolClient = new MetricoolClient(config);

  logger.info('Testing Metricool connection');
  const connectionTest = await metricoolClient.testConnection();

  logger.info('Metricool connection test result:', {
    details: connectionTest?.details,
    error: connectionTest?.error,
    success: connectionTest?.success,
  });

  return connectionTest;
};

/**
 * Get all posts from Metricool API in a standardized format
 * @returns {Object} Standardized posts data
 */
export const getAllMetricoolPostsFormatted = async () => {
  const metricoolClient = new MetricoolClient(config);

  const posts = await metricoolClient.getAllScheduledAndDraftPosts();

  if (!posts || !posts.data) {
    throw new ApiError(
      'Failed to retrieve posts from Metricool',
      ERROR_CODES.EXTERNAL_API_ERROR,
      500
    );
  }

  // Transform the data for API response
  const transformedPosts = posts.data.map(post => ({
    creationDate: post.creationDate,
    draft: post.draft,
    id: post.id,
    media: post.media || [],
    providers: post.providers || [],
    publicationDate: post.publicationDate,
    text: post.text,
    uuid: post.uuid,
  }));

  return {
    count: transformedPosts.length,
    data: transformedPosts,
    success: true,
  };
};
