/**
 * Campaign Media Portfolio Controller
 * Get campaign media portfolio
 */

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const mediaParamsSchema = z.object({
  stockNumber: z.string().min(1, 'Stock number is required'),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Get Campaign Media Portfolio
 * GET /campaigns/:stockNumber/media
 */
export const getCampaignMedia = async (req, res) => {
  try {
    const { stockNumber } = mediaParamsSchema.parse(req.params);

    logger.info('Fetching campaign media portfolio', {
      requestId: req.requestId,
      stockNumber,
    });

    const campaign = await SocialCampaigns.findOne(
      { stock_number: stockNumber },
      { media_urls: 1, stock_number: 1, title: 1 }
    );

    if (!campaign) {
      const error = new ApiError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Campaign not found'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
        stock_number: stockNumber,
      });
    }

    const response = {
      media_portfolio: campaign.media_urls || [],
      portfolio_count: (campaign.media_urls || []).length,
      stock_number: campaign.stock_number,
      title: campaign.title,
    };

    logger.info('Media portfolio retrieved successfully', {
      mediaCount: response.portfolio_count,
      requestId: req.requestId,
      stockNumber,
    });

    res.json(response);
  } catch (error) {
    logger.error('Error fetching media portfolio', {
      error: error.message,
      requestId: req.requestId,
      stack: error.stack,
      stockNumber: req.params.stockNumber,
    });

    if (error instanceof z.ZodError) {
      const apiError = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        ERROR_MESSAGES.INVALID_REQUEST_PARAMS,
        400,
        error.errors
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        details: apiError.details,
        error: apiError.message,
      });
    }

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
    res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      message: 'Failed to fetch media portfolio',
    });
  }
};
