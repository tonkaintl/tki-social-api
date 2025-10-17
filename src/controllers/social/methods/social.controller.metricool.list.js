// ----------------------------------------------------------------------------
// GET /social/campaigns/metricool/all
// Get all scheduled and draft posts from Metricool
// ----------------------------------------------------------------------------

import { z } from 'zod';

import { MetricoolClient } from '../../../adapters/metricool/metricool.client.js';
import { config } from '../../../config/env.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import MetricoolPosts from '../../../models/metricoolPosts.model.js';
import { logger } from '../../../utils/logger.js';

// Validation schema for query parameters
const querySchema = z.object({
  includePublished: z
    .string()
    .optional()
    .transform(str => str === 'true'),
  status: z
    .string()
    .optional()
    .transform(str => (str ? str.split(',') : ['DRAFT', 'PENDING'])),
  sync: z
    .string()
    .optional()
    .transform(str => str === 'true'),
});

/**
 * Get all scheduled and draft posts from Metricool
 * GET /social/campaigns/metricool/all
 */
export const getAllMetricoolPosts = async (req, res, next) => {
  try {
    // Validate query parameters
    const validationResult = querySchema.safeParse(req.query);
    if (!validationResult.success) {
      logger.warn('Invalid query parameters for Metricool posts retrieval', {
        errors: validationResult.error.errors,
        query: req.query,
      });

      throw new ApiError(
        'Invalid query parameters',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        validationResult.error.errors
      );
    }

    const { includePublished, status, sync } = validationResult.data;

    // Add published status if requested
    const statusFilter = [...status];
    if (includePublished) {
      statusFilter.push('PUBLISHED');
    }

    // Initialize Metricool client
    const metricoolClient = new MetricoolClient(config);

    // Test connection first
    logger.info('Testing Metricool connection before retrieving posts');
    const connectionTest = await metricoolClient.testConnection();
    logger.info('Metricool connection test result:', {
      details: connectionTest?.details,
      error: connectionTest?.error,
      success: connectionTest?.success,
    });

    logger.info('Retrieving all Metricool posts', {
      includePublished,
      statusFilter,
    });

    let posts;
    if (statusFilter.length === 0) {
      // Get all posts without filtering
      posts = await metricoolClient.getAllScheduledAndDraftPosts();
    } else {
      // Get posts filtered by status
      posts = await metricoolClient.getPostsByStatus(statusFilter);
    }

    // Debug logging - let's see what Metricool actually returns
    logger.debug('Metricool API response:', {
      dataLength: posts.data?.length,
      success: posts.success,
    });
    logger.debug('First post structure:', {
      firstPost: posts.data?.[0]
        ? Object.keys(posts.data[0]).sort()
        : 'No posts',
    });

    logger.info('Raw Metricool response', {
      dataCount: posts?.data?.length || 0,
      error: posts?.error,
      rawData: posts?.data?.slice(0, 2), // Log first 2 posts for debugging
      success: posts?.success,
    });

    if (!posts || !posts.data) {
      throw new ApiError(
        'Failed to retrieve posts from Metricool',
        ERROR_CODES.EXTERNAL_API_ERROR,
        500
      );
    }

    // Initialize sync results (will be populated if sync is requested)
    let syncResults = null;

    // Sync to database if requested
    if (sync) {
      logger.info('Syncing Metricool posts to database', {
        postsToSync: posts.data.length,
      });

      syncResults = {
        created: 0,
        errors: 0,
        updated: 0,
      };

      for (const post of posts.data) {
        try {
          // Since we're just building this system, all posts start as orphaned
          // Later we can build logic to match posts to stock numbers
          const stockNumber = null;

          const postData = {
            auto_publish: post.autoPublish || false,
            creation_date: post.creationDate,
            creator_user_id: post.creatorUserId,

            creator_user_mail: post.creatorUserMail,
            draft: post.draft || false,
            facebook_data: post.facebookData || {},
            first_comment_text: post.firstCommentText || '',
            has_not_read_notes: post.hasNotReadNotes || false,
            // Metricool fields (mapped correctly)
            id: post.id,
            instagram_data: post.instagramData || {},
            linkedin_data: post.linkedinData || {},
            media: post.media || [],
            media_alt_text: post.mediaAltText || [],
            // Our business fields
            metricool_id: post.id.toString(),
            providers: post.providers || [],
            publication_date: post.publicationDate,
            save_external_media_files: post.saveExternalMediaFiles || false,
            shortener: post.shortener || false,
            status: post.draft ? 'draft' : 'scheduled',
            stock_number: stockNumber, // Extracted from text or null for orphaned
            synced_at: new Date(),
            text: post.text,
            tiktok_data: post.tiktokData || {},
            twitter_data: post.twitterData || {},
            uuid: post.uuid,
          };

          // Only update existing posts (no upsert - don't create new ones)
          const result = await MetricoolPosts.updateOne(
            { metricool_id: post.id.toString() },
            postData
          );

          if (result.matchedCount > 0 && result.modifiedCount > 0) {
            syncResults.updated++;
            logger.debug('Updated existing Metricool post', {
              metricool_id: post.id,
              uuid: post.uuid,
            });
          } else if (result.matchedCount === 0) {
            // Post not found in our database - skip it (not one of ours)
            logger.debug('Skipped Metricool post (not in our database)', {
              metricool_id: post.id,
              uuid: post.uuid,
            });
          }
        } catch (syncError) {
          syncResults.errors++;
          logger.error('Failed to sync individual post', {
            error: syncError.message,
            metricool_id: post.id,
            uuid: post.uuid,
          });
        }
      }

      logger.info('Metricool sync completed', syncResults);
    }

    // Transform the data for our API response
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

    logger.info('Successfully retrieved Metricool posts', {
      count: transformedPosts.length,
      statusFilter,
      syncEnabled: sync,
    });

    const response = {
      count: transformedPosts.length,
      data: transformedPosts,
      filters: {
        includePublished,
      },
      message: 'Metricool posts retrieved successfully',
      success: true,
    };

    // Add sync results if sync was performed
    if (sync && syncResults) {
      response.sync = syncResults;
      response.message += ` and ${syncResults.created + syncResults.updated} posts synced to database`;
    }

    return res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to retrieve Metricool posts', {
      error: error.message,
      stack: error.stack,
    });

    // Pass to error handler
    next(error);
  }
};
