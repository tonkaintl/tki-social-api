// ----------------------------------------------------------------------------
// POST /social/campaigns/:campaignId/metricool/draft
// Create a draft post in Metricool from campaign data
// ----------------------------------------------------------------------------

import { z } from 'zod';

import { MetricoolClient } from '../../../adapters/metricool/metricool.client.js';
import { config } from '../../../config/env.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import MetricoolPosts from '../../../models/metricoolPosts.model.js';
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
});

// Platform mapping from internal names to Metricool network names
const PLATFORM_TO_NETWORK_MAP = {
  linkedin: 'linkedin',
  meta: 'facebook',
  reddit: 'reddit', // Assuming Metricool supports reddit
  x: 'twitter',
};

/**
 * Create draft posts in Metricool from campaign's proposed_posts
 * POST /social/campaigns/:campaignId/metricool/draft
 */
export const createMetricoolDraft = async (req, res, next) => {
  try {
    const { campaignId } = req.params;

    // Validate request body
    const validationResult = createMetricoolDraftSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      logger.warn('Metricool draft creation validation failed', {
        campaignId,
        errors: validationResult.error.errors,
      });

      throw new ApiError(
        `Validation failed: ${errorMessage}`,
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    const { draft, platforms, scheduledDate } = validationResult.data;

    // Check if campaign exists and has proposed_posts
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
      campaignId,
      platforms: postsToProcess.map(p => p.platform),
      postCount: postsToProcess.length,
    });

    for (const proposedPost of postsToProcess) {
      try {
        // Convert platform to Metricool network format
        const network = PLATFORM_TO_NETWORK_MAP[proposedPost.platform];
        if (!network) {
          logger.warn('Unsupported platform for Metricool', {
            campaignId,
            platform: proposedPost.platform,
          });
          errors.push({
            error: `Platform '${proposedPost.platform}' not supported by Metricool`,
            platform: proposedPost.platform,
          });
          continue;
        }

        // Build Metricool payload for this specific post
        const draftPayload = {
          autoPublish: false, // Always false for drafts
          draft: draft,
          media: proposedPost.media_urls || [], // Use post-specific media or empty array
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
          campaignId,
          network,
          platform: proposedPost.platform,
          textPreview: proposedPost.text.substring(0, 100),
        });

        const metricoolResponse =
          await metricoolClient.createPost(draftPayload);

        logger.info('Metricool API response received', {
          campaignId,
          platform: proposedPost.platform,
          responseId: metricoolResponse?.data?.id,
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

        // Store Metricool post in dedicated collection
        const metricoolPostId = metricoolResponse.data.id.toString();
        const metricoolData = metricoolResponse.data;

        // Check if this Metricool post already exists
        let metricoolPost = await MetricoolPosts.findOne({
          metricool_id: metricoolPostId,
        });

        if (metricoolPost) {
          // Update existing post
          metricoolPost.auto_publish = metricoolData.autoPublish || false;
          metricoolPost.stock_number = campaignId;
          metricoolPost.creator_user_mail = metricoolData.creatorUserMail;
          metricoolPost.creator_user_id = metricoolData.creatorUserId;
          metricoolPost.draft = metricoolData.draft || false;
          metricoolPost.media = metricoolData.media || [];
          metricoolPost.media_alt_text = metricoolData.mediaAltText || [];
          metricoolPost.creation_date = metricoolData.creationDate;
          metricoolPost.publication_date = metricoolData.publicationDate;
          metricoolPost.providers = metricoolData.providers || [];
          metricoolPost.status = draft ? 'draft' : 'scheduled';
          metricoolPost.text = proposedPost.text;
          metricoolPost.uuid = metricoolData.uuid;
          metricoolPost.twitter_data = metricoolData.twitterData || {};
          metricoolPost.facebook_data = metricoolData.facebookData || {};
          metricoolPost.instagram_data = metricoolData.instagramData || {};
          metricoolPost.linkedin_data = metricoolData.linkedinData || {};
          metricoolPost.tiktok_data = metricoolData.tiktokData || {};

          await metricoolPost.save();

          logger.info('Updated existing Metricool post', {
            campaignId,
            metricoolPostId,
            platform: proposedPost.platform,
          });
        } else {
          // Create new post
          metricoolPost = new MetricoolPosts({
            auto_publish: metricoolData.autoPublish || false,
            creation_date: metricoolData.creationDate,
            creator_user_id: metricoolData.creatorUserId,
            creator_user_mail: metricoolData.creatorUserMail,
            draft: metricoolData.draft || false,
            facebook_data: metricoolData.facebookData || {},
            instagram_data: metricoolData.instagramData || {},
            linkedin_data: metricoolData.linkedinData || {},
            media: metricoolData.media || [],
            media_alt_text: metricoolData.mediaAltText || [],
            metricool_id: metricoolPostId,
            providers: metricoolData.providers || [],
            publication_date: metricoolData.publicationDate,
            status: draft ? 'draft' : 'scheduled',
            stock_number: campaignId,
            text: proposedPost.text,
            tiktok_data: metricoolData.tiktokData || {},
            twitter_data: metricoolData.twitterData || {},
            uuid: metricoolData.uuid,
          });

          await metricoolPost.save();

          logger.info('Created new Metricool post', {
            campaignId,
            metricoolPostId,
            platform: proposedPost.platform,
          });
        }

        // Add to successful results
        metricoolResults.push({
          metricoolPostId: metricoolPostId,
          network: network,
          platform: proposedPost.platform,
          status: draft ? 'draft' : 'scheduled',
          text:
            proposedPost.text.substring(0, 200) +
            (proposedPost.text.length > 200 ? '...' : ''),
        });
      } catch (postError) {
        logger.error('Failed to create Metricool post for platform', {
          campaignId,
          error: postError.message,
          platform: proposedPost.platform,
        });

        errors.push({
          error: postError.message,
          platform: proposedPost.platform,
        });
      }
    }

    // Update campaign status if we created any posts
    if (metricoolResults.length > 0) {
      if (campaign.status === 'pending') {
        campaign.status = draft ? 'draft' : 'scheduled';
        await campaign.save();
      }
    }

    logger.info('Metricool draft posts processing completed', {
      campaignId,
      errorCount: errors.length,
      successCount: metricoolResults.length,
    });

    // Return response with both successes and errors
    const response = {
      data: {
        campaignId,
        errors: errors,
        metricoolDashboardUrl: `https://app.metricool.com/evolution/web?blogId=${config.METRICOOL_BLOG_ID}&userId=${config.METRICOOL_USER_ID}`,
        metricoolPosts: metricoolResults,
        processedCount: metricoolResults.length,
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
      campaignId: req.params.campaignId,
      error: error.message,
      stack: error.stack,
    });

    // Pass to error handler
    next(error);
  }
};
