// ----------------------------------------------------------------------------
// Metricool Service - Shared logic for syncing Metricool posts
// ----------------------------------------------------------------------------

import { MetricoolClient } from '../adapters/metricool/metricool.client.js';
import { config } from '../config/env.js';
import { METRICOOL_STATUS } from '../constants/campaigns.js';
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

  console.log('\n>>> ALL METRICOOL POSTS FROM API <<<');
  console.log(`Total posts returned: ${allMetricoolPosts.data.length}`);
  allMetricoolPosts.data.forEach(post => {
    console.log(
      `  - ID: ${post.id}, Draft: ${post.draft}, Status: ${post.providers?.[0]?.status}, Platform: ${post.providers?.[0]?.provider}`
    );
  });

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
    postsRemapped: 0,
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
          // Post no longer exists in Metricool
          // Try to find a replacement by searching for stock number in text
          console.log(
            `\n⚠️  Post ${proposedPost.metricool_id} not found in Metricool. Searching for replacement...`
          );

          const stockNumberPattern = new RegExp(campaign.stock_number, 'i');
          let foundReplacement = false;

          for (const [newId, newPost] of metricoolPostsMap) {
            // Skip if already matched to another post
            if (
              campaign.proposed_posts.some(
                p => p.metricool_id === newId && p !== proposedPost
              )
            ) {
              continue;
            }

            // Check if text contains stock number and matches platform
            if (newPost.text && stockNumberPattern.test(newPost.text)) {
              // Try to match platform if possible
              const newPlatform =
                newPost.providers?.[0]?.provider?.toLowerCase();
              const matchesPlatform =
                !newPlatform || newPlatform === proposedPost.platform;

              if (matchesPlatform) {
                console.log(`    ✅ FOUND REPLACEMENT:`);
                console.log(`       Old ID: ${proposedPost.metricool_id}`);
                console.log(`       New ID: ${newId}`);
                console.log(`       Platform: ${proposedPost.platform}`);
                console.log(`       Stock #: ${campaign.stock_number}`);

                // Update to new Metricool ID and sync all fields
                const oldId = proposedPost.metricool_id;
                proposedPost.metricool_id = newId;
                proposedPost.metricool_status =
                  newPost.providers?.[0]?.status || METRICOOL_STATUS.PENDING;
                proposedPost.draft = newPost.draft;
                proposedPost.text = newPost.text;

                if (newPost.publicationDate?.dateTime) {
                  // Metricool returns dates in Central Time without timezone indicator
                  proposedPost.metricool_scheduled_date = new Date(
                    newPost.publicationDate.dateTime + '-05:00'
                  );
                }

                // DO NOT sync media_urls - those are managed separately and should never be overwritten

                campaignUpdated = true;
                syncResults.postsRemapped++;
                foundReplacement = true;

                syncResults.details.push({
                  action: 'remapped',
                  new_metricool_id: newId,
                  old_metricool_id: oldId,
                  platform: proposedPost.platform,
                  reason: 'Found replacement post with matching stock number',
                  stock_number: campaign.stock_number,
                });

                console.log(
                  `       Text updated: ${newPost.text?.substring(0, 50)}...`
                );
                console.log(
                  `       Date updated: ${proposedPost.metricool_scheduled_date?.toISOString()}`
                );
                console.log(
                  `       Media count: ${proposedPost.media_urls?.length || 0}`
                );

                // Remove from map so it's not checked again
                metricoolPostsMap.delete(newId);
                break;
              }
            }
          }

          if (!foundReplacement) {
            // No replacement found - mark as ERROR
            proposedPost.metricool_status = METRICOOL_STATUS.ERROR;
            campaignUpdated = true;
            syncResults.postsDeleted++;

            console.log(`    ❌ NO REPLACEMENT FOUND - marking as ERROR`);

            syncResults.details.push({
              action: 'deleted',
              metricool_id: proposedPost.metricool_id,
              platform: proposedPost.platform,
              reason: 'Post not found in Metricool and no replacement found',
              stock_number: campaign.stock_number,
            });

            logger.debug('Marked proposed post as ERROR (not found)', {
              metricool_id: proposedPost.metricool_id,
              platform: proposedPost.platform,
              stock_number: campaign.stock_number,
            });
          }
          continue;
        }

        // Log raw Metricool data for debugging
        console.log(
          `\n>>> RAW METRICOOL DATA for ${proposedPost.platform} (ID: ${proposedPost.metricool_id})`
        );
        console.log(`    Draft: ${metricoolData.draft}`);
        console.log(`    Status: ${metricoolData.providers?.[0]?.status}`);
        console.log(
          `    Publication Date: ${metricoolData.publicationDate?.dateTime}`
        );
        console.log(`    Text: ${metricoolData.text?.substring(0, 100)}...`);
        console.log(`    Media Count: ${metricoolData.media?.length || 0}`);

        // Get the actual status from the provider (metricoolData.providers[0].status)
        // This will be 'PENDING', 'PUBLISHED', 'ERROR', or 'PUBLISHING'
        const currentStatus =
          metricoolData.providers?.[0]?.status || METRICOOL_STATUS.PENDING;

        // Update draft flag from Metricool
        if (metricoolData.draft !== undefined) {
          if (proposedPost.draft !== metricoolData.draft) {
            console.log(
              `    ✏️  DRAFT CHANGED: ${proposedPost.draft} → ${metricoolData.draft}`
            );
            proposedPost.draft = metricoolData.draft;
            campaignUpdated = true;
          }
        }

        // Check if status changed
        if (proposedPost.metricool_status !== currentStatus) {
          console.log(
            `    ✏️  STATUS CHANGED: ${proposedPost.metricool_status} → ${currentStatus}`
          );
          proposedPost.metricool_status = currentStatus;
          campaignUpdated = true;
          syncResults.postsUpdated++;

          syncResults.details.push({
            action: 'updated',
            draft: metricoolData.draft,
            metricool_id: proposedPost.metricool_id,
            newStatus: currentStatus,
            oldStatus: proposedPost.metricool_status,
            platform: proposedPost.platform,
            stock_number: campaign.stock_number,
          });
        }

        // Update scheduled dates if different
        if (metricoolData.publicationDate?.dateTime) {
          // Metricool returns dates in Central Time without timezone indicator
          // Append timezone to ensure correct parsing
          const metricoolDate = new Date(
            metricoolData.publicationDate.dateTime + '-05:00'
          );

          console.log(`    📅 DATE COMPARISON:`);
          console.log(
            `        Raw from API: ${metricoolData.publicationDate.dateTime}`
          );
          console.log(
            `        Parsed as Central: ${metricoolDate.toISOString()}`
          );
          console.log(
            `        DB has: ${proposedPost.metricool_scheduled_date?.toISOString() || 'null'}`
          );

          if (
            !proposedPost.metricool_scheduled_date ||
            proposedPost.metricool_scheduled_date.getTime() !==
              metricoolDate.getTime()
          ) {
            console.log(`    ✏️  SCHEDULED DATE CHANGED - UPDATING!`);
            proposedPost.metricool_scheduled_date = metricoolDate;
            campaignUpdated = true;
          }
        }

        // Compare text content
        if (metricoolData.text !== proposedPost.text) {
          console.log(`    ⚠️  TEXT DIFFERS:`);
          console.log(`        DB: ${proposedPost.text?.substring(0, 80)}...`);
          console.log(
            `        Metricool: ${metricoolData.text?.substring(0, 80)}...`
          );
        }

        // Compare media URLs
        const dbMediaCount = proposedPost.media_urls?.length || 0;
        const metricoolMediaCount = metricoolData.media?.length || 0;
        if (dbMediaCount !== metricoolMediaCount) {
          console.log(
            `    ⚠️  MEDIA COUNT DIFFERS: DB has ${dbMediaCount}, Metricool has ${metricoolMediaCount}`
          );
        }
      }

      // Save campaign if any proposed posts were updated
      if (campaignUpdated) {
        campaign.updated_at = new Date();
        // Mark the proposed_posts array as modified so Mongoose knows to save it
        campaign.markModified('proposed_posts');
        await campaign.save();
        syncResults.campaignsProcessed++;

        console.log(`    ✅ CAMPAIGN SAVED: ${campaign.stock_number}`);
      }
    } catch (error) {
      syncResults.errors++;
      syncResults.details.push({
        action: 'error',
        error: error.message,
        stack: error.stack,
        stock_number: campaign.stock_number,
      });

      logger.error('Failed to sync campaign', {
        error: error.message,
        stack: error.stack,
        stock_number: campaign.stock_number,
      });

      // Log full error details to console for debugging
      console.error('\n❌ SYNC ERROR DETAILS:');
      console.error(`   Stock: ${campaign.stock_number}`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
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
