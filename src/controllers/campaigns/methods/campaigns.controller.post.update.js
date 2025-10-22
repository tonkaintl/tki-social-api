/**
 * Social Campaign Update Controller
 * Updates campaign with fresh Binder data, preserving user-added content like media portfolio
 */

import { z } from 'zod';

import { BinderAdapter } from '../../../adapters/binder/binder.adapter.js';
import { config } from '../../../config/env.js';
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

const updateCampaignParamsSchema = z.object({
  stockNumber: z.string().min(1, 'Stock number is required'),
});

const updateCampaignBodySchema = z.object({
  // Force refresh from Binder data
  refreshFromBinder: z.boolean().optional().default(true),
  // Allow status override
  status: z
    .enum(['pending', 'draft', 'scheduled', 'published', 'failed'])
    .optional(),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Update Campaign
 * PUT /social/campaigns/:stockNumber
 */
export const updateCampaign = async (req, res) => {
  try {
    // Validate parameters and body
    const paramsValidation = updateCampaignParamsSchema.safeParse(req.params);
    const bodyValidation = updateCampaignBodySchema.safeParse(req.body);

    if (!paramsValidation.success) {
      logger.warn('Invalid campaign update parameters', {
        errors: paramsValidation.error.errors,
        params: req.params,
        requestId: req.requestId,
      });
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        ERROR_MESSAGES.INVALID_REQUEST_PARAMS,
        400,
        paramsValidation.error.errors
      );
      return res.status(error.statusCode).json({
        code: error.code,
        details: error.details,
        error: error.message,
      });
    }

    if (!bodyValidation.success) {
      logger.warn('Invalid campaign update body', {
        body: req.body,
        errors: bodyValidation.error.errors,
        requestId: req.requestId,
      });
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        400,
        bodyValidation.error.errors
      );
      return res.status(error.statusCode).json({
        code: error.code,
        details: error.details,
        error: error.message,
      });
    }

    const { stockNumber } = paramsValidation.data;
    const updateData = bodyValidation.data;

    logger.info('Updating campaign with fresh Binder data', {
      refreshFromBinder: updateData.refreshFromBinder,
      requestId: req.requestId,
      statusOverride: updateData.status,
      stockNumber,
    });

    // Step 1: Find existing campaign
    const existingCampaign = await SocialCampaigns.findOne({
      stock_number: stockNumber,
    });

    if (!existingCampaign) {
      logger.warn('Campaign not found for update', {
        requestId: req.requestId,
        stockNumber,
      });
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

    // Step 2: Fetch fresh data from Binder if requested
    let updateObject = {
      updated_at: new Date(),
    };

    if (updateData.refreshFromBinder) {
      try {
        const binderAdapter = new BinderAdapter(config);
        const freshItem = await binderAdapter.getItem(stockNumber);

        // Update fields that may have changed in Binder
        updateObject = {
          ...updateObject,
          base_message: freshItem.title, // Update base message from fresh item title
          description: freshItem.description,
          title: freshItem.title,
          url: freshItem.url,
          // Preserve user-added fields like media_urls and status
        };

        logger.info('Updated campaign with fresh Binder data', {
          requestId: req.requestId,
          stockNumber,
        });
      } catch (binderError) {
        logger.warn(
          'Failed to fetch fresh Binder data, proceeding with status-only update',
          {
            binderError: binderError.message,
            requestId: req.requestId,
            stockNumber,
          }
        );
      }
    }

    // Step 3: Apply status override if provided
    if (updateData.status) {
      updateObject.status = updateData.status;
    }

    // Step 4: Update campaign
    const updatedCampaign = await SocialCampaigns.findOneAndUpdate(
      { stock_number: stockNumber },
      { $set: updateObject },
      {
        new: true,
      }
    );

    logger.info('Campaign updated successfully', {
      requestId: req.requestId,
      stockNumber,
    });

    // Format response
    const response = {
      campaign: updatedCampaign, // Return complete campaign object including base_message
      message: 'Campaign updated with fresh Binder data',
      refreshedFromBinder: updateData.refreshFromBinder,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error updating campaign', {
      error: error.message,
      requestId: req.requestId,
      stack: error.stack,
      stockNumber: req.params.stockNumber,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
    res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      message: 'Failed to update campaign',
    });
  }
};
