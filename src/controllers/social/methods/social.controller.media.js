/**
 * Social Campaign Media Portfolio Controllers
 * CRUD operations for campaign media portfolio management
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

const addMediaBodySchema = z.object({
  description: z.string().optional(),
  mediaType: z.enum(['image', 'video']).optional().default('image'),
  mediaUrl: z.string().url('Valid URL is required'),
});

const updateMediaParamsSchema = z.object({
  mediaIndex: z.string().transform(val => parseInt(val, 10)),
  stockNumber: z.string().min(1, 'Stock number is required'),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Get Campaign Media Portfolio
 * GET /social/campaigns/:stockNumber/media
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
        'Invalid request parameters',
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

/**
 * Add Media to Campaign Portfolio
 * POST /social/campaigns/:stockNumber/media
 */
export const addCampaignMedia = async (req, res) => {
  try {
    const { stockNumber } = mediaParamsSchema.parse(req.params);
    const mediaData = addMediaBodySchema.parse(req.body);

    logger.info('Adding media to campaign portfolio', {
      mediaType: mediaData.mediaType,
      requestId: req.requestId,
      stockNumber,
    });

    const updatedCampaign = await SocialCampaigns.findOneAndUpdate(
      { stock_number: stockNumber },
      {
        $addToSet: { media_urls: mediaData.mediaUrl },
        $set: { updated_at: new Date() },
      },
      { new: true, projection: { media_urls: 1, stock_number: 1, title: 1 } }
    );

    if (!updatedCampaign) {
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
      added_media: mediaData.mediaUrl,
      media_portfolio: updatedCampaign.media_urls,
      message: 'Media added to portfolio successfully',
      portfolio_count: updatedCampaign.media_urls.length,
      stock_number: updatedCampaign.stock_number,
    };

    logger.info('Media added to portfolio successfully', {
      mediaUrl: mediaData.mediaUrl,
      portfolioCount: updatedCampaign.media_urls.length,
      requestId: req.requestId,
      stockNumber,
    });

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error adding media to portfolio', {
      error: error.message,
      requestId: req.requestId,
      stack: error.stack,
      stockNumber: req.params.stockNumber,
    });

    if (error instanceof z.ZodError) {
      const apiError = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request data',
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
      message: 'Failed to add media to portfolio',
    });
  }
};

/**
 * Remove Media from Campaign Portfolio
 * DELETE /social/campaigns/:stockNumber/media/:mediaIndex
 */
export const removeCampaignMedia = async (req, res) => {
  try {
    const { stockNumber } = mediaParamsSchema.parse(req.params);
    const { mediaIndex } = updateMediaParamsSchema.parse(req.params);

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
        'Invalid request parameters',
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
