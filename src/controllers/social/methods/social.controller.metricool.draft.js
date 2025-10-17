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

// Request validation schema based on official Metricool API
const createMetricoolDraftSchema = z.object({
  autoPublish: z.boolean().optional().default(false),
  draft: z.boolean().optional().default(true), // Default to draft mode
  media: z.array(z.string().url('Invalid media URL')).optional().default([]),
  providers: z
    .array(
      z.object({
        id: z.string().optional(), // Provider-specific ID (page ID, etc.)
        network: z.enum(
          ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'youtube'],
          {
            invalid_type_error: 'Invalid network type',
            required_error: 'Network is required',
          }
        ),
      })
    )
    .min(1, 'At least one provider is required'),
  publicationDate: z
    .object({
      dateTime: z
        .string()
        .regex(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})?$/,
          'Invalid publication date format'
        )
        .optional()
        .transform(date => {
          const targetDate = date
            ? new Date(date)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          // Format as yyyy-MM-ddTHH:mm:ss (without Z)
          return targetDate.toISOString().slice(0, 19);
        }),
      timezone: z.string().optional().default('UTC'),
    })
    .optional()
    .transform(data => ({
      dateTime:
        data?.dateTime ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 19),
      timezone: data?.timezone || 'UTC',
    })),
  text: z.string().min(1, 'Post text is required').max(5000, 'Text too long'),
});

/**
 * Create a draft post in Metricool from campaign data
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

    const { autoPublish, draft, media, providers, publicationDate, text } =
      validationResult.data;

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

    // Initialize Metricool client
    const metricoolClient = new MetricoolClient(config);

    // Create draft post in Metricool using official API schema
    const draftPayload = {
      autoPublish,
      draft,
      media, // Array of URL strings
      providers, // Array of provider objects with network and optional id
      publicationDate, // Object with dateTime and timezone
      text,
    };

    logger.info('Creating Metricool draft post', {
      campaignId,
      networks: providers.map(p => p.network),
    });

    const metricoolResponse = await metricoolClient.createPost(draftPayload);

    logger.info('Metricool API response received', {
      campaignId,
      response: metricoolResponse,
      responseId: metricoolResponse?.id,
    });

    // Check if we got a valid response with an ID
    if (
      !metricoolResponse ||
      !metricoolResponse.data ||
      !metricoolResponse.data.id
    ) {
      throw new ApiError(
        'Metricool API did not return a valid post ID',
        ERROR_CODES.EXTERNAL_API_ERROR,
        500,
        { metricoolResponse }
      );
    }

    // Store/update Metricool post in dedicated collection
    const metricoolPostId = metricoolResponse.data.id.toString();
    const metricoolData = metricoolResponse.data;

    // Extract networks from providers array
    const networks = providers.map(p => p.network);

    // Check if this Metricool post already exists
    let metricoolPost = await MetricoolPosts.findOne({
      metricool_id: metricoolPostId,
    });

    if (metricoolPost) {
      // Update existing post - use correct field names from flattened model
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
      metricoolPost.text = text;
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
        networks,
      });
    } else {
      // Create new post - use correct field names from flattened model
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
        text: text,
        tiktok_data: metricoolData.tiktokData || {},
        twitter_data: metricoolData.twitterData || {},
        uuid: metricoolData.uuid,
      });

      await metricoolPost.save();

      logger.info('Created new Metricool post', {
        campaignId,
        metricoolPostId,
        networks,
      });
    }

    // Update campaign status if this is the first social post
    if (campaign.status === 'draft') {
      campaign.status = 'pending_approval'; // Has social content pending
    }

    await campaign.save();

    logger.info('Metricool draft post created successfully', {
      campaignId,
      metricoolPostId: metricoolResponse.data.id,
      networks: providers.map(p => p.network),
    });

    // Return success response
    res.status(201).json({
      data: {
        campaignId,
        metricoolDashboardUrl: `https://app.metricool.com/evolution/web?blogId=${config.METRICOOL_BLOG_ID}&userId=${config.METRICOOL_USER_ID}`,
        metricoolPost: {
          id: metricoolResponse.data.id,
          networks: providers.map(p => p.network),
          publishDate: publicationDate.dateTime,
          status: draft ? 'draft' : 'pending',
          text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        },
      },
      message: 'Draft post created successfully in Metricool',
    });
  } catch (error) {
    logger.error('Failed to create Metricool draft', {
      campaignId: req.params.campaignId,
      error: error.message,
      stack: error.stack,
    });

    // Pass to error handler
    next(error);
  }
};
