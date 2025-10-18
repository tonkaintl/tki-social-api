/**
 * Social Campaign Preview Controller
 * Preview how a campaign would look on a specific platform
 */

import { z } from 'zod';

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import {
  generatePlatformContent,
  SUPPORTED_PROVIDERS,
} from '../../../utils/contentGeneration.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const getCampaignPreviewParamsSchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS, {
    errorMap: () => ({
      message: 'Provider must be one of: meta, linkedin, x, reddit',
    }),
  }),
  stockNumber: z.string().min(1, 'Stock number is required'),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Get Campaign Preview for Platform
 * GET /social/campaigns/preview
 */
export const getCampaignPreview = async (req, res, next) => {
  try {
    const { provider, stockNumber } = getCampaignPreviewParamsSchema.parse(
      req.params
    );

    logger.info('Campaign preview request', {
      provider,
      requestId: req.id,
      stockNumber,
    });

    // Fetch campaign to get base_message
    const campaign = await SocialCampaigns.findOne({
      stock_number: stockNumber,
    });

    // Generate content for the requested platform using campaign's base_message
    const { formattedContent, item } = await generatePlatformContent(
      stockNumber,
      provider,
      campaign?.base_message
    );

    logger.info('Campaign preview generated', {
      provider,
      requestId: req.id,
      stockNumber,
    });

    return res.status(200).json({
      formattedContent,
      item,
      provider,
      requestId: req.id,
      stockNumber,
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Campaign preview validation failed', {
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

    logger.error('Campaign preview error', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    next(error);
  }
};
