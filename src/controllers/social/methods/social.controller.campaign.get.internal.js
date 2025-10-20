// ----------------------------------------------------------------------------
// GET /social/campaigns/internal/:stockNumber
// Get a social media campaign by stock number (internal service call)
// ----------------------------------------------------------------------------

import { z } from 'zod';

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const getCampaignInternalParamsSchema = z.object({
  stockNumber: z.string().min(1, 'Stock number is required'),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Get Campaign by Stock Number (internal service call)
 * GET /social/campaigns/internal/:stockNumber
 *
 * Authentication: x-internal-secret header required
 * Response: Campaign object or 404 if not found
 */
export const getCampaignByStockNumberInternal = async (req, res, next) => {
  try {
    const { stockNumber } = getCampaignInternalParamsSchema.parse(req.params);

    logger.info('Fetching campaign by stock number (internal)', {
      requestId: req.id,
      stockNumber,
    });

    // Find campaign by stock number
    const campaign = await SocialCampaigns.findOne({
      stock_number: stockNumber,
    }).lean();

    if (!campaign) {
      logger.warn('Campaign not found (internal)', {
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
        error: null,
        message: error.message,
      });
    }

    logger.info('Campaign retrieved successfully (internal)', {
      campaignId: campaign._id,
      requestId: req.id,
      stockNumber,
    });

    return res.status(200).json(campaign);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Campaign retrieval validation failed (internal)', {
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
        error: apiError.details,
        message: apiError.message,
      });
    }

    logger.error('Error fetching campaign (internal)', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
      stockNumber: req.params.stockNumber,
    });

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.details || null,
        message: error.message,
      });
    }

    next(error);
  }
};
