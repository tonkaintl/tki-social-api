/**
 * Campaign Media Portfolio Controller
 * Remove media from campaign portfolio
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

const removeMediaParamsSchema = z.object({
  mediaIndex: z.string().transform(val => parseInt(val, 10)),
  stockNumber: z.string().min(1, 'Stock number is required'),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Remove Media from Campaign Portfolio
 * DELETE /campaigns/:stockNumber/media/:mediaIndex
 */
export const removeCampaignMedia = async (req, res) => {
  try {
    const { stockNumber } = mediaParamsSchema.parse(req.params);
    const { mediaIndex } = removeMediaParamsSchema.parse(req.params);

    logger.info('Removing media from campaign portfolio', {
      mediaIndex,
      requestId: req.requestId,
      stockNumber,
    });

    // First, get the campaign to check the media exists
    const campaign = await SocialCampaigns.findOne(
      { stock_number: stockNumber },
      { media_urls: 1 }
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

    if (
      !campaign.media_urls ||
      mediaIndex >= campaign.media_urls.length ||
      mediaIndex < 0
    ) {
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid media index'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
        media_index: mediaIndex,
        portfolio_size: campaign.media_urls?.length || 0,
      });
    }

    const removedMediaUrl = campaign.media_urls[mediaIndex];

    // Remove the media URL at the specified index
    const updatedMediaUrls = campaign.media_urls.filter(
      (_, index) => index !== mediaIndex
    );

    const updatedCampaign = await SocialCampaigns.findOneAndUpdate(
      { stock_number: stockNumber },
      {
        $set: {
          media_urls: updatedMediaUrls,
          updated_at: new Date(),
        },
      },
      { new: true, projection: { media_urls: 1, stock_number: 1 } }
    );

    const response = {
      media_portfolio: updatedCampaign.media_urls,
      message: 'Media removed from portfolio successfully',
      portfolio_count: updatedCampaign.media_urls.length,
      removed_media: removedMediaUrl,
      stock_number: updatedCampaign.stock_number,
    };

    logger.info('Media removed from portfolio successfully', {
      portfolioCount: updatedCampaign.media_urls.length,
      removedMedia: removedMediaUrl,
      requestId: req.requestId,
      stockNumber,
    });

    res.json(response);
  } catch (error) {
    logger.error('Error removing media from portfolio', {
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
      message: 'Failed to remove media from portfolio',
    });
  }
};
