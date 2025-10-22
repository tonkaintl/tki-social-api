// ----------------------------------------------------------------------------
// POST /social/campaigns
// Create a social media campaign from binder item
// ----------------------------------------------------------------------------

import { z } from 'zod';

import { BinderAdapter } from '../../../adapters/binder/binder.adapter.js';
import { config } from '../../../config/env.js';
import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import { logger } from '../../../utils/logger.js';

// Request validation schema
const createCampaignSchema = z.object({
  createdBy: z.string().min(1, 'Created by is required').optional(),
  stockNumber: z.string().min(1, 'Stock number is required'),
});

/**
 * Create social media campaign from binder item
 * POST /social/campaigns
 */
export const createSocialCampaign = async (req, res, next) => {
  try {
    // Validate request body
    const validationResult = createCampaignSchema.safeParse(req.body);

    if (!validationResult.success) {
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        ERROR_MESSAGES.INVALID_REQUEST_DATA,
        400,
        validationResult.error.errors
      );
      return res.status(error.statusCode).json({
        code: error.code,
        details: error.details,
        message: error.message,
      });
    }

    const { createdBy, stockNumber } = validationResult.data;

    logger.info('Creating social media campaign', {
      createdBy,
      requestId: req.requestId,
      stockNumber,
    });

    // Initialize binder adapter
    const binderAdapter = new BinderAdapter(config);

    // Create or update campaign using binder adapter (upsert)
    const campaign = await binderAdapter.upsertCampaign(stockNumber, createdBy);

    logger.info('Campaign created successfully', {
      campaignId: campaign.campaign_id,
      requestId: req.requestId,
      stockNumber,
    });

    // Return success response
    res.status(201).json({
      campaign,
      message: 'Campaign created successfully',
      success: true,
    });
  } catch (error) {
    logger.error('Error creating campaign', {
      error: error.message,
      requestId: req.requestId,
      stack: error.stack,
      stockNumber: req.body.stockNumber,
    });

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
      });
    }

    next(error);
  }
};
