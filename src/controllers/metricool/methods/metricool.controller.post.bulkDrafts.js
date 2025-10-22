// ----------------------------------------------------------------------------
// POST /metricool/bulk-drafts
// Create draft posts for all platforms in Metricool from campaign data
// ----------------------------------------------------------------------------

import { z } from 'zod';

import { MetricoolClient } from '../../../adapters/metricool/metricool.client.js';
import { config } from '../../../config/env.js';
import { METRICOOL_STATUS } from '../../../constants/campaigns.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// Request validation schema - now expects platform selection from proposed_posts
const createMetricoolDraftSchema = z.object({
  draft: z.boolean().optional().default(true), // Default to draft mode
  platforms: z
    .array(z.enum(['meta', 'linkedin', 'x', 'reddit']))
    .min(1, 'At least one platform is required')
    .optional(), // If not provided, will draft all enabled proposed_posts
  scheduledDate: z
    .string()
    .datetime('Invalid scheduled date format')
    .optional()
    .transform(date => {
      if (!date) {
        // Default to 30 days from now if no date provided (draft mode)
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 19);
      }
      return new Date(date).toISOString().slice(0, 19);
    }),
  stockNumber: z.string().min(1, 'Stock number is required'), // Campaign/stock number
});

// Platform mapping from internal names to Metricool network names
const PLATFORM_TO_NETWORK_MAP = {
  linkedin: 'linkedin',
  meta: 'facebook',
  x: 'twitter',
};

/**
 * Create draft posts for all platforms in Metricool from campaign's proposed_posts
 * POST /metricool/bulk-drafts
 */
export const createMetricoolBulkDraft = async (req, res, next) => {
  try {
    // Validate request body
    const validationResult = createMetricoolDraftSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      logger.warn('Metricool draft creation validation failed', {
        body: req.body,
        errors: validationResult.error.errors,
      });

      throw new ApiError(
        `Validation failed: ${errorMessage}`,
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    const { draft, platforms, scheduledDate, stockNumber } =
      validationResult.data;

    // Check if campaign exists and has proposed_posts
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

    if (!campaign.proposed_posts || campaign.proposed_posts.length === 0) {
      throw new ApiError(
        'No proposed posts found for this campaign',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // Filter proposed posts based on request
    let postsToProcess = campaign.proposed_posts.filter(post => post.enabled);

    if (platforms && platforms.length > 0) {
      // Only process specified platforms
      postsToProcess = postsToProcess.filter(post =>
        platforms.includes(post.platform)
      );
    }

    if (postsToProcess.length === 0) {
      throw new ApiError(
        'No enabled proposed posts found for specified platforms',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // Initialize Metricool client
    const metricoolClient = new MetricoolClient(config);

    // Process each proposed post individually
    const metricoolResults = [];
    const errors = [];

    logger.info('Creating Metricool draft posts', {
      platforms: postsToProcess.map(p => p.platform),
      postCount: postsToProcess.length,
      stockNumber,
    });

    for (const proposedPost of postsToProcess) {
      try {
        // Convert platform to Metricool network format
        const network = PLATFORM_TO_NETWORK_MAP[proposedPost.platform];
        if (!network) {
          logger.warn('Unsupported platform for Metricool', {
            platform: proposedPost.platform,
            stockNumber,
          });
          errors.push({
            error: `Platform '${proposedPost.platform}' not supported by Metricool`,
            platform: proposedPost.platform,
          });
          continue;
        }

        // Build Metricool payload for this specific post
        // Transform media URLs to match Metricool's expected format
        const mediaUrls = (proposedPost.media_urls || []).map(
          media => media.url
        );

        const draftPayload = {
          autoPublish: false, // Always false for drafts
          draft: draft,
          media: mediaUrls, // Use only the URL strings, not the full media objects
          providers: [{ network }], // Single provider per post
          publicationDate: {
            dateTime: proposedPost.scheduled_date
              ? new Date(proposedPost.scheduled_date).toISOString().slice(0, 19)
              : scheduledDate,
            timezone: 'UTC',
          },
          text: proposedPost.text,
        };

        logger.info('Creating individual Metricool draft', {
          network,
          platform: proposedPost.platform,
          stockNumber,
          textPreview: proposedPost.text.substring(0, 100),
        });

        const metricoolResponse =
          await metricoolClient.createPost(draftPayload);

        console.error('=== METRICOOL RESPONSE ===');
        console.error(JSON.stringify(metricoolResponse, null, 2));
        console.error('=========================');

        logger.info('Metricool API response received', {
          metricoolResponse: JSON.stringify(metricoolResponse),
          platform: proposedPost.platform,
          responseId: metricoolResponse?.data?.id,
          stockNumber,
        });

        // Check if we got a valid response with an ID
        if (
          !metricoolResponse ||
          !metricoolResponse.data ||
          !metricoolResponse.data.id
        ) {
          errors.push({
            error: 'Metricool API did not return a valid post ID',
            platform: proposedPost.platform,
            response: metricoolResponse,
          });
          continue;
        }

        // Store Metricool post info back to the campaign's proposed post
        const metricoolPostId = metricoolResponse.data.id.toString();
        const metricoolData = metricoolResponse.data;

        // Update the proposed post with Metricool tracking info
        const updateResult = await SocialCampaigns.updateOne(
          {
            'proposed_posts.platform': proposedPost.platform,
            stock_number: stockNumber,
          },
          {
            $set: {
              'proposed_posts.$.draft': draft,
              'proposed_posts.$.metricool_created_at': new Date(),
              'proposed_posts.$.metricool_id': metricoolPostId,
              'proposed_posts.$.metricool_scheduled_date': metricoolData
                .publicationDate?.dateTime
                ? new Date(metricoolData.publicationDate.dateTime)
                : null,
              'proposed_posts.$.metricool_status':
                metricoolData.providers?.[0]?.status || 'PENDING',
            },
          }
        );

        if (updateResult.modifiedCount === 0) {
          logger.warn('Failed to update proposed post with Metricool info', {
            metricoolPostId,
            platform: proposedPost.platform,
            stockNumber,
          });
        } else {
          logger.info('Updated proposed post with Metricool info', {
            draft: draft,
            metricoolPostId,
            metricoolStatus: metricoolData.providers?.[0]?.status || 'PENDING',
            platform: proposedPost.platform,
            stockNumber,
          });
        }

        // Add to successful results
        metricoolResults.push({
          draft: draft,
          metricoolPostId: metricoolPostId,
          network: network,
          platform: proposedPost.platform,
          text:
            proposedPost.text.substring(0, 200) +
            (proposedPost.text.length > 200 ? '...' : ''),
        });
      } catch (postError) {
        logger.error('Failed to create Metricool post for platform', {
          error: postError.message,
          errorDetails: postError.details || null,
          platform: proposedPost.platform,
          stockNumber,
        });

        errors.push({
          error: postError.message,
          platform: proposedPost.platform,
          statusCode: postError.statusCode || null,
        });
      }
    }

    // Update campaign status if we created any posts
    if (metricoolResults.length > 0) {
      // Campaign status stays as PENDING until posts are published
      campaign.status = METRICOOL_STATUS.PENDING;
      await campaign.save();
    }

    logger.info('Metricool draft posts processing completed', {
      errorCount: errors.length,
      stockNumber,
      successCount: metricoolResults.length,
    });

    // Return response with both successes and errors
    const response = {
      data: {
        errors: errors,
        metricoolDashboardUrl: `https://app.metricool.com/evolution/web?blogId=${config.METRICOOL_BLOG_ID}&userId=${config.METRICOOL_USER_ID}`,
        metricoolPosts: metricoolResults,
        processedCount: metricoolResults.length,
        stockNumber,
        totalRequested: postsToProcess.length,
      },
      message:
        metricoolResults.length > 0
          ? `${metricoolResults.length} draft post(s) created successfully in Metricool${errors.length > 0 ? ` (${errors.length} failed)` : ''}`
          : 'No posts were created successfully',
    };

    const statusCode = metricoolResults.length > 0 ? 201 : 400;
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Failed to create Metricool drafts', {
      error: error.message,
      stack: error.stack,
    });

    // Pass to error handler
    next(error);
  }
};
