// ----------------------------------------------------------------------------
// GET /social/campaigns/:campaignId/metricool/refresh
// Refresh Metricool post data to sync with any changes made directly in Metricool
// ----------------------------------------------------------------------------

import { MetricoolClient } from '../../../adapters/metricool/metricool.client.js';
import { config } from '../../../config/env.js';
import { CAMPAIGN_STATUS } from '../../../constants/campaigns.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import MetricoolPosts from '../../../models/metricoolPosts.model.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Refresh Metricool post data to sync with changes made directly in Metricool
 * GET /social/campaigns/:campaignId/metricool/refresh
 */
export const refreshMetricoolPosts = async (req, res, next) => {
  try {
    const { campaignId } = req.params;

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

    // Get all Metricool posts for this campaign
    const metricoolPosts = await MetricoolPosts.find({
      stock_number: campaignId,
    });

    if (metricoolPosts.length === 0) {
      return res.status(200).json({
        data: {
          campaignId,
          postsDeleted: 0,
          postsRefreshed: 0,
          postsUpdated: 0,
        },
        message: 'No Metricool posts found for this campaign',
      });
    }

    // Initialize Metricool client
    const metricoolClient = new MetricoolClient(config);

    let postsUpdated = 0;
    let postsDeleted = 0;
    const refreshResults = [];

    logger.info('Refreshing Metricool posts', {
      campaignId,
      totalPosts: metricoolPosts.length,
    });

    // Check each post with Metricool API
    for (const post of metricoolPosts) {
      try {
        // Try to get current post data from Metricool
        const currentData = await metricoolClient.getPost(post.metricool_id);

        if (!currentData || !currentData.data) {
          // Post no longer exists in Metricool - mark as deleted
          post.status = CAMPAIGN_STATUS.FAILED; // Use 'failed' to indicate deleted
          post.updated_at = new Date();
          await post.save();

          postsDeleted++;
          refreshResults.push({
            action: 'deleted',
            metricool_id: post.metricool_id,
            reason: 'Post not found in Metricool',
          });

          logger.warn('Metricool post not found, marking as deleted', {
            campaignId,
            metricoolId: post.metricool_id,
          });
          continue;
        }

        // Compare current data with stored data
        const metricoolData = currentData.data;
        let hasChanges = false;

        // Check for changes in key fields using correct field names
        if (
          post.text !== metricoolData.text ||
          post.status !== (metricoolData.draft ? 'draft' : 'scheduled') ||
          new Date(post.publication_date.date_time).getTime() !==
            new Date(metricoolData.publicationDate.dateTime).getTime()
        ) {
          hasChanges = true;
        }

        if (hasChanges) {
          // Update post with current Metricool data using correct field names
          post.auto_publish = metricoolData.autoPublish || false;
          post.creator_user_mail = metricoolData.creatorUserMail;
          post.creator_user_id = metricoolData.creatorUserId;
          post.draft = metricoolData.draft || false;
          post.media = metricoolData.media || [];
          post.media_alt_text = metricoolData.mediaAltText || [];
          post.creation_date = metricoolData.creationDate;
          post.publication_date = metricoolData.publicationDate;
          post.providers = metricoolData.providers || [];
          post.status = metricoolData.draft ? 'draft' : 'scheduled';
          post.text = metricoolData.text;
          post.twitter_data = metricoolData.twitterData || {};
          post.facebook_data = metricoolData.facebookData || {};
          post.instagram_data = metricoolData.instagramData || {};
          post.linkedin_data = metricoolData.linkedinData || {};
          post.tiktok_data = metricoolData.tiktokData || {};
          post.uuid = metricoolData.uuid;
          post.updated_at = new Date();

          await post.save();

          postsUpdated++;
          refreshResults.push({
            action: 'updated',
            changes: {
              date_changed:
                new Date(post.publication_date.date_time).getTime() !==
                new Date(metricoolData.publicationDate.dateTime).getTime(),
              status_changed:
                post.status !== (metricoolData.draft ? 'draft' : 'scheduled'),
              text_changed: post.text !== metricoolData.text,
            },
            metricool_id: post.metricool_id,
          });

          logger.info('Metricool post updated', {
            campaignId,
            metricoolId: post.metricool_id,
          });
        } else {
          refreshResults.push({
            action: 'no_change',
            metricool_id: post.metricool_id,
          });
        }
      } catch (error) {
        // Handle individual post refresh errors
        if (error.response?.status === 404) {
          // Post deleted in Metricool
          post.status = CAMPAIGN_STATUS.FAILED;
          post.updated_at = new Date();
          await post.save();

          postsDeleted++;
          refreshResults.push({
            action: 'deleted',
            metricool_id: post.metricool_id,
            reason: 'Post not found in Metricool (404)',
          });
        } else {
          logger.error('Failed to refresh individual post', {
            campaignId,
            error: error.message,
            metricoolId: post.metricool_id,
          });

          refreshResults.push({
            action: 'error',
            error: error.message,
            metricool_id: post.metricool_id,
          });
        }
      }
    }

    logger.info('Metricool posts refresh completed', {
      campaignId,
      postsDeleted,
      postsUpdated,
      totalPosts: metricoolPosts.length,
    });

    // Return success response
    res.status(200).json({
      data: {
        campaignId,
        postsDeleted,
        postsRefreshed: metricoolPosts.length,
        postsUpdated,
        refreshResults,
      },
      message: `Refreshed ${metricoolPosts.length} posts: ${postsUpdated} updated, ${postsDeleted} deleted`,
    });
  } catch (error) {
    logger.error('Failed to refresh Metricool posts', {
      campaignId: req.params.campaignId,
      error: error.message,
      stack: error.stack,
    });

    // Pass to error handler
    next(error);
  }
};
