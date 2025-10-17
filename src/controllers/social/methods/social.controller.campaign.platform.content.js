import { z } from 'zod';

import { SUPPORTED_PROVIDERS } from '../../../constants/providers.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// Validation schema for platform content
const platformContentSchema = z.object({
  platform_content: z
    .array(
      z.object({
        comment: z.string().optional(),
        custom_text: z.string().optional(),
        enabled: z.boolean().default(true),
        platform: z.enum(SUPPORTED_PROVIDERS),
        scheduled_date: z
          .string()
          .datetime()
          .optional()
          .or(z.date().optional()),
      })
    )
    .optional(),
});

/**
 * PATCH /campaigns/:campaignId/platform-content
 * Update platform-specific content and comments for a campaign
 */
export const updatePlatformContent = async (req, res) => {
  try {
    const { campaignId: stockNumber } = req.params;

    // Validate request body
    const validationResult = platformContentSchema.safeParse(req.body);
    if (!validationResult.success) {
      logger.warn('Platform content validation failed', {
        errors: validationResult.error.errors,
        stockNumber,
      });

      return res.status(400).json({
        details: validationResult.error.errors,
        error: 'VALIDATION_ERROR',
        message: 'Invalid platform content data',
        statusCode: 400,
      });
    }

    const { platform_content } = validationResult.data;

    // Find campaign by stock number
    const campaign = await SocialCampaigns.findOne({
      stock_number: stockNumber,
    });
    if (!campaign) {
      logger.warn('Campaign not found for platform content update', {
        stockNumber,
      });

      return res.status(404).json({
        error: 'RESOURCE_NOT_FOUND',
        message: 'Campaign not found',
        statusCode: 404,
      });
    }

    // Convert scheduled_date strings to Date objects if provided
    if (platform_content) {
      platform_content.forEach(content => {
        if (
          content.scheduled_date &&
          typeof content.scheduled_date === 'string'
        ) {
          content.scheduled_date = new Date(content.scheduled_date);
        }
      });
    }

    // Update the campaign
    const updateData = {
      updated_at: new Date(),
    };

    if (platform_content) {
      updateData.platform_content = platform_content;
    }

    const updatedCampaign = await SocialCampaigns.findOneAndUpdate(
      { stock_number: stockNumber },
      updateData,
      { new: true, runValidators: true }
    );

    logger.info('Platform content updated successfully', {
      platformCount: platform_content?.length || 0,
      platforms: platform_content?.map(p => p.platform) || [],
      stockNumber,
    });

    return res.status(200).json({
      data: {
        platform_content: updatedCampaign.platform_content,
        stock_number: updatedCampaign.stock_number,
        title: updatedCampaign.title,
        updated_at: updatedCampaign.updated_at,
      },
      message: 'Platform content updated successfully',
      success: true,
    });
  } catch (error) {
    logger.error('Error updating platform content', {
      error: error.message,
      stack: error.stack,
      stockNumber: req.params.campaignId,
    });

    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred while updating platform content',
      statusCode: 500,
    });
  }
};
