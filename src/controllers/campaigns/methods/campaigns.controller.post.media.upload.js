// ----------------------------------------------------------------------------
// POST /api/campaigns/:stockNumber/media/upload
// Multipart upload: stream file → R2, then append to campaign media portfolio.
//
// Multer parses the multipart body upstream (uploadMedia middleware); the
// file lands on req.file as a Buffer.
// ----------------------------------------------------------------------------

import crypto from 'crypto';

import { z } from 'zod';

import { MEDIA_STORAGE } from '../../../constants/campaigns.js';
import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import { mediaTypeFromMime } from '../../../middleware/upload.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { buildPublicUrl, uploadObject } from '../../../services/r2.service.js';
import { logger } from '../../../utils/logger.js';

const paramsSchema = z.object({
  stockNumber: z.string().min(1, 'Stock number is required'),
});

const bodySchema = z.object({
  alt: z.string().optional(),
  description: z.string().optional(),
  // Frontend sends comma-separated; split here.
  tags: z.string().optional(),
});

// Strip filesystem-hostile characters from the original filename before
// using it inside an R2 key. Keep extension intact.
function sanitizeFilename(name) {
  if (!name) return 'file';
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 120);
}

export const uploadCampaignMedia = async (req, res) => {
  try {
    const { stockNumber } = paramsSchema.parse(req.params);
    const { alt, description, tags } = bodySchema.parse(req.body || {});

    if (!req.file) {
      const apiError = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'file field is required (multipart/form-data)',
        400
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        error: apiError.message,
      });
    }

    // Confirm campaign exists before pushing bytes to R2.
    const exists = await SocialCampaigns.exists({ stock_number: stockNumber });
    if (!exists) {
      const apiError = new ApiError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Campaign not found',
        404
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        error: apiError.message,
        stock_number: stockNumber,
      });
    }

    const originalName = sanitizeFilename(req.file.originalname);
    const uniquePrefix = crypto.randomUUID();
    const r2Key = `campaigns/${stockNumber}/${uniquePrefix}-${originalName}`;

    logger.info('Uploading campaign media to R2', {
      contentType: req.file.mimetype,
      r2Key,
      requestId: req.requestId,
      size: req.file.size,
      stockNumber,
    });

    await uploadObject({
      body: req.file.buffer,
      cacheControl: 'public, max-age=31536000, immutable',
      contentType: req.file.mimetype,
      key: r2Key,
    });

    const publicUrl = buildPublicUrl(r2Key);

    const mediaObject = {
      alt: alt || undefined,
      created_at: new Date(),
      description: description || undefined,
      filename: req.file.originalname,
      media_type: mediaTypeFromMime(req.file.mimetype),
      r2_key: r2Key,
      size: req.file.size,
      tags: tags
        ? tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)
        : [],
      url: publicUrl,
    };

    const updatedCampaign = await SocialCampaigns.findOneAndUpdate(
      { stock_number: stockNumber },
      {
        $push: { media_urls: mediaObject },
        $set: {
          media_storage: MEDIA_STORAGE.R2,
          updated_at: new Date(),
        },
      },
      { new: true, projection: { media_urls: 1, stock_number: 1 } }
    );

    logger.info('Campaign media uploaded', {
      portfolioCount: updatedCampaign.media_urls.length,
      r2Key,
      requestId: req.requestId,
      stockNumber,
    });

    return res.status(201).json({
      media_portfolio: updatedCampaign.media_urls,
      stock_number: updatedCampaign.stock_number,
    });
  } catch (error) {
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

    logger.error('Error uploading campaign media', {
      error: error.message,
      requestId: req.requestId,
      stack: error.stack,
      stockNumber: req.params.stockNumber,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      message: 'Failed to upload campaign media',
    });
  }
};
