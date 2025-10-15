/**
 * Social Campaign Update Controller
 * Updates campaign status, content, and posts
 */

import { z } from 'zod';

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const updateCampaignParamsSchema = z.object({
  stockNumber: z.string().min(1, 'Stock number is required'),
});

const updateCampaignBodySchema = z.object({
  platform_content: z
    .object({
      facebook: z.object({ text: z.string() }).optional(),
      instagram: z.object({ caption: z.string() }).optional(),
      linkedin: z.object({ text: z.string() }).optional(),
      x: z.object({ text: z.string() }).optional(),
    })
    .optional(),
  status: z.enum(['draft', 'queued', 'posting', 'posted', 'failed']).optional(),
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
        'Invalid request parameters',
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

    logger.info('Updating campaign', {
      requestId: req.requestId,
      stockNumber,
      updateFields: Object.keys(updateData),
    });

    // Build update object
    const updateObject = {
      updated_at: new Date(),
    };

    if (updateData.status) {
      updateObject.status = updateData.status;
    }

    if (updateData.platform_content) {
      updateObject.platform_content = updateData.platform_content;
    }

    // Update campaign
    const updatedCampaign = await SocialCampaigns.findOneAndUpdate(
      { stock_number: stockNumber },
      { $set: updateObject },
      {
        new: true,
        projection: {
          'posts.platform_response': 0, // Exclude large response data
        },
      }
    );

    if (!updatedCampaign) {
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

    logger.info('Campaign updated successfully', {
      requestId: req.requestId,
      status: updatedCampaign.status,
      stockNumber,
    });

    // Format response
    const response = {
      campaign: {
        campaign_id: updatedCampaign.campaign_id,
        created_at: updatedCampaign.created_at,
        inventory_data: updatedCampaign.inventory_data,
        platform_content: updatedCampaign.platform_content,
        status: updatedCampaign.status,
        stock_number: updatedCampaign.stock_number,
        updated_at: updatedCampaign.updated_at,
      },
      message: 'Campaign updated successfully',
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
      'Internal server error'
    );
    res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      message: 'Failed to update campaign',
    });
  }
};
