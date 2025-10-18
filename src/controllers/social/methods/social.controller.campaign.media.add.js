/**
 * Campaign Media Portfolio Controller
 * Add media to campaign portfolio
 */

import { z } from 'zod';

import { MEDIA_TYPE_VALUES } from '../../../constants/campaigns.js';
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
  alt: z.string().optional(),
  description: z.string().optional(),
  filename: z.string().optional(),
  mediaType: z.enum(MEDIA_TYPE_VALUES).optional().default('image'),
  mediaUrl: z.string().url('Valid URL is required'),
  size: z.number().optional(),
  tags: z.array(z.string()).optional().default([]),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Add Media to Campaign Portfolio
 * POST /campaigns/:stockNumber/media
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

    // Create media object with metadata
    const mediaObject = {
      alt: mediaData.alt,
      created_at: new Date(),
      description: mediaData.description,
      filename: mediaData.filename,
      media_type: mediaData.mediaType,
      size: mediaData.size,
      tags: mediaData.tags || [],
      url: mediaData.mediaUrl,
    };

    const updatedCampaign = await SocialCampaigns.findOneAndUpdate(
      { stock_number: stockNumber },
      {
        $addToSet: { media_urls: mediaObject },
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
      added_media: mediaObject,
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
