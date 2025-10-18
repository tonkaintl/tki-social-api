/**
 * Campaign Text Update Controller
 * Update base message and proposed post text
 */

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { SUPPORTED_PROVIDERS } from '../../../utils/contentGeneration.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const updateTextParamsSchema = z.object({
  stockNumber: z.string().min(1, 'Stock number is required'),
});

const updateTextBodySchema = z.object({
  base_message: z.string().min(1, 'Base message is required'),
  posts: z.array(
    z.object({
      enabled: z.boolean().optional(),
      platform: z.enum(SUPPORTED_PROVIDERS),
      scheduled_date: z.string().datetime().optional().nullable(),
      text: z.string().min(1, 'Post text is required'),
    })
  ),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Update Campaign Text
 * PATCH /campaigns/:stockNumber/update-text
 */
export const updateProposedPosts = async (req, res) => {
  try {
    const { stockNumber } = updateTextParamsSchema.parse(req.params);
    const { base_message, posts } = updateTextBodySchema.parse(req.body);

    // Find existing campaign
    const existingCampaign = await SocialCampaigns.findOne({
      stock_number: stockNumber,
    });

    if (!existingCampaign) {
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

    // Update base message and proposed posts
    const updateObject = {
      base_message,
      updated_at: new Date(),
    };

    // Update proposed posts text
    const updatedProposedPosts = existingCampaign.proposed_posts.map(
      existingPost => {
        const updatedPost = posts.find(
          p => p.platform === existingPost.platform
        );
        if (updatedPost) {
          return {
            ...existingPost.toObject(),
            enabled: updatedPost.enabled ?? existingPost.enabled,
            scheduled_date: updatedPost.scheduled_date
              ? new Date(updatedPost.scheduled_date)
              : existingPost.scheduled_date,
            text: updatedPost.text,
          };
        }
        return existingPost.toObject();
      }
    );

    updateObject.proposed_posts = updatedProposedPosts;

    const updatedCampaign = await SocialCampaigns.findOneAndUpdate(
      { stock_number: stockNumber },
      { $set: updateObject },
      { new: true }
    );

    logger.info('Campaign text updated', { stockNumber });

    res.json({
      campaign: updatedCampaign,
      message: 'Campaign text updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Request validation failed',
        400,
        error.errors
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        details: apiError.details,
        error: apiError.message,
      });
    }

    logger.error('Error updating campaign text', {
      error: error.message,
      stockNumber: req.params.stockNumber,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
    res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
    });
  }
};
