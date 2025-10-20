// ----------------------------------------------------------------------------
// POST /social/campaigns/internal
// Create a social media campaign from TKI Binder API (internal service call)
// ----------------------------------------------------------------------------

import { z } from 'zod';

import { BinderAdapter } from '../../../adapters/binder/binder.adapter.js';
import { config } from '../../../config/env.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { logger } from '../../../utils/logger.js';

// Request validation schema for internal TKI Binder calls
const createCampaignInternalSchema = z.object({
  stock_number: z.string().min(1, 'Stock number is required'),
  user_name: z.string().min(1, 'User name is required'),
});

/**
 * Create social media campaign from TKI Binder API (internal service call)
 * POST /social/campaigns/internal
 *
 * Authentication: x-internal-secret header required
 * Request: { stock_number: string, user_name: string }
 * Response: { _id: string, status: string }
 */
export const createSocialCampaignInternal = async (req, res, next) => {
  try {
    logger.info('Received internal campaign creation request:', req.body);
    // Validate request body
    const validationResult = createCampaignInternalSchema.safeParse(req.body);

    if (!validationResult.success) {
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Request validation failed',
        400,
        validationResult.error.errors
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.details,
        message: error.message,
      });
    }

    const { stock_number, user_name } = validationResult.data;

    logger.info('Creating social media campaign (internal)', {
      requestId: req.id,
      stock_number,
      user_name,
    });

    // Initialize binder adapter
    const binderAdapter = new BinderAdapter(config);

    // Create or update campaign using binder adapter (map user_name to createdBy)
    const campaign = await binderAdapter.upsertCampaign(
      stock_number,
      user_name
    );

    logger.info('Campaign created successfully (internal)', {
      campaignId: campaign._id || campaign.campaign_id,
      requestId: req.id,
      stock_number,
    });

    // Return full campaign object
    return res.status(201).json(campaign);
  } catch (error) {
    logger.error('Error creating campaign (internal)', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
      stock_number: req.body?.stock_number,
      user_name: req.body?.user_name,
    });

    // Return error format expected by TKI Binder API
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.details || null,
        message: error.message,
      });
    }

    // Handle unexpected errors - use next() for consistency with error middleware
    next(error);
  }
};
