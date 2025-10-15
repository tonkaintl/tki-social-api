/**
 * Social Campaign Update Controller
 * Updates campaign status, content, and posts
 */

import { z } from 'zod';

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
      return res.status(400).json({
        details: paramsValidation.error.errors,
        error: 'Invalid request parameters',
      });
    }

    if (!bodyValidation.success) {
      logger.warn('Invalid campaign update body', {
        body: req.body,
        errors: bodyValidation.error.errors,
        requestId: req.requestId,
      });
      return res.status(400).json({
        details: bodyValidation.error.errors,
        error: 'Invalid request body',
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
      return res.status(404).json({
        error: 'Campaign not found',
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

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update campaign',
    });
  }
};
