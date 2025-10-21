// ----------------------------------------------------------------------------
// GET /internal/campaigns/:stockNumber
// Get a social media campaign by stock number (internal service call)
// ----------------------------------------------------------------------------

import { z } from 'zod';

import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const getCampaignInternalParamsSchema = z.object({
  stockNumber: z.string().min(1, 'Stock number is required'),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Get Campaign by Stock Number (internal service call)
 * GET /internal/campaigns/:stockNumber
 *
 * Authentication: x-internal-secret header required
 * Response: Campaign object or null if not found
 */
export const getCampaign = async (req, res, next) => {
  try {
    const { stockNumber } = getCampaignInternalParamsSchema.parse(req.params);

    logger.info('Fetching campaign by stock number (internal)', {
      requestId: req.id,
      stockNumber,
    });

    // Find campaign by stock number
    const campaign = await SocialCampaigns.findOne({
      stock_number: stockNumber,
    }).lean();

    if (!campaign) {
      logger.info('Campaign not found (internal)', {
        requestId: req.id,
        stockNumber,
      });

      return res.status(200).json(null);
    }

    logger.info('Campaign retrieved successfully (internal)', {
      campaignId: campaign._id,
      requestId: req.id,
      stockNumber,
    });

    return res.status(200).json(campaign);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.errors,
        message: 'Invalid stock number',
      });
    }

    logger.error('Error fetching campaign (internal)', {
      error: error.message,
      requestId: req.id,
      stockNumber: req.params.stockNumber,
    });

    next(error);
  }
};
