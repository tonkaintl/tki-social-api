import { z } from 'zod';

import { LinkedInAdapter } from '../../../adapters/linkedin/linkedin.adapter.js';
import { MetaAdapter } from '../../../adapters/meta/meta.adapter.js';
import { RedditAdapter } from '../../../adapters/reddit/reddit.adapter.js';
import { XAdapter } from '../../../adapters/x/x.adapter.js';
import { config } from '../../../config/env.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// !!!! THIS IS FOR DIRECT POSTING TO SOCIAL PLATFORMS USING CAMPAIGN DATA AND DYNAMIC CONTENT GENERATION !!!!
// ----------------------------------------------------------------------------
// Supported Providers and Adapters
// ----------------------------------------------------------------------------
const SUPPORTED_PROVIDERS = ['meta', 'linkedin', 'x', 'reddit'];

const adapters = {
  linkedin: new LinkedInAdapter(config),
  meta: new MetaAdapter(config),
  reddit: new RedditAdapter(config),
  x: new XAdapter(config),
};

// Request validation schema
const postItemSchema = z.object({
  mediaUrls: z.array(z.string().url()).optional(), // Optional override of campaign media
  pageIdOrHandle: z.string().optional(),
  provider: z.enum(SUPPORTED_PROVIDERS),
  stockNumber: z.string().min(1),
  utm: z
    .object({
      campaign: z.string().optional(),
      content: z.string().optional(),
      medium: z.string().optional(),
      source: z.string().optional(),
      term: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/social/post-item
 * Post campaign to social media using dynamic content generation
 */
export const postItemToSocial = async (req, res, next) => {
  try {
    const { mediaUrls, pageIdOrHandle, provider, stockNumber, utm } =
      postItemSchema.parse(req.body);

    logger.info('Post campaign to social request', {
      provider,
      requestId: req.id,
      stockNumber,
    });

    // Get campaign from database
    const campaign = await SocialCampaigns.findOne({
      stock_number: stockNumber,
    });

    if (!campaign) {
      const apiError = new ApiError(
        ERROR_CODES.CAMPAIGN_NOT_FOUND,
        `Campaign not found for stock number: ${stockNumber}`,
        404
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        message: apiError.message,
        requestId: req.id,
      });
    }

    // Use campaign media portfolio or provided override
    const campaignMediaUrls =
      mediaUrls ||
      campaign.media_urls
        ?.filter(media => ['image', 'video'].includes(media.media_type))
        ?.map(media => media.url) ||
      [];

    // Post to the social platform using campaign data
    const adapter = adapters[provider];
    const result = await adapter.createPostFromCampaign(campaign, provider, {
      mediaUrls: campaignMediaUrls,
      pageIdOrHandle,
      utm,
    });

    logger.info('Campaign posted to social', {
      campaignId: campaign._id,
      mediaCount: campaignMediaUrls.length,
      provider,
      requestId: req.id,
      status: result.status,
      stockNumber,
    });

    // Determine status code based on result
    // - 200 for success or graceful failures (adapter not configured, etc.)
    // - 500 only for actual API errors or unexpected failures
    let statusCode = 200;
    if (
      result.status === 'failed' &&
      result.raw?.error &&
      !result.raw.error.includes('not configured') &&
      !result.raw.error.includes('not implemented')
    ) {
      // Only return 500 for real API errors, not graceful failures
      statusCode = 500;
    }

    return res.status(statusCode).json({
      ...result,
      provider,
      requestId: req.id,
      stockNumber,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Request validation failed',
        400,
        error.errors
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        errors: apiError.details,
        message: apiError.message,
        requestId: req.id,
      });
    }

    next(error);
  }
};
