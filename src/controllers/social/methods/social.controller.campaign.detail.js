/**
 * Social Campaign Detail Controller
 * Retrieves individual campaign details with dynamic platform formatting
 */

import { z } from 'zod';

import { BinderAdapter } from '../../../adapters/binder/binder.adapter.js';
import { formatBinderItemForLinkedIn } from '../../../adapters/linkedin/formatters/binder-item.formatter.js';
import { formatBinderItemForMeta } from '../../../adapters/meta/formatters/binder-item.formatter.js';
import { formatBinderItemForReddit } from '../../../adapters/reddit/formatters/binder-item.formatter.js';
import { formatBinderItemForX } from '../../../adapters/x/formatters/binder-item.formatter.js';
import { config } from '../../../config/env.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const formatters = {
  facebook_page: formatBinderItemForMeta,
  instagram_business: formatBinderItemForMeta, // Same as Facebook for now
  linkedin_company: formatBinderItemForLinkedIn,
  reddit: formatBinderItemForReddit,
  x_profile: formatBinderItemForX,
};

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const getCampaignParamsSchema = z.object({
  stockNumber: z.string().min(1, 'Stock number is required'),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Get Campaign by Stock Number with Dynamic Platform Formatting
 * GET /social/campaigns/:stockNumber
 */
export const getCampaignByStockNumber = async (req, res, next) => {
  try {
    const { stockNumber } = getCampaignParamsSchema.parse(req.params);

    logger.info('Fetching campaign details', {
      requestId: req.id,
      stockNumber,
    });

    // Step 1: Find campaign by stock number
    const campaign = await SocialCampaigns.findOne({
      stock_number: stockNumber,
    });

    if (!campaign) {
      logger.warn('Campaign not found', {
        requestId: req.id,
        stockNumber,
      });
      const error = new ApiError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Campaign not found',
        404
      );
      return res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
        requestId: req.id,
        stockNumber,
      });
    }

    // Step 2: Fetch fresh item from Binder for dynamic formatting
    const binderAdapter = new BinderAdapter(config);
    const item = await binderAdapter.getItem(stockNumber);

    // Step 3: Generate platform-specific formatted content
    const platformContent = {
      facebook_page: formatters.facebook_page(item),
      instagram_business: formatters.instagram_business(item),
      linkedin_company: formatters.linkedin_company(item),
      reddit: formatters.reddit(item),
      x_profile: formatters.x_profile(item),
    };

    // Step 4: Build response
    const response = {
      campaign, // Return complete campaign object including proposed_posts
      item, // Fresh Binder data
      platformContent, // Dynamically formatted content
      requestId: req.id,
      success: true,
    };

    logger.info('Campaign details retrieved with dynamic formatting', {
      requestId: req.id,
      stockNumber,
    });

    return res.status(200).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Campaign detail validation failed', {
        errors: error.errors,
        requestId: req.id,
      });

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

    logger.error('Error fetching campaign details', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
      stockNumber: req.params.stockNumber,
    });

    next(error);
  }
};
