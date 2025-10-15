/**
 * Social Campaign Preview Controller
 * Preview how a campaign would look on a specific platform
 */

import { z } from 'zod';

import { BinderAdapter } from '../../../adapters/binder/binder.adapter.js';
import { formatBinderItemForLinkedIn } from '../../../adapters/linkedin/formatters/binder-item.formatter.js';
import { formatBinderItemForMeta } from '../../../adapters/meta/formatters/binder-item.formatter.js';
import { formatBinderItemForReddit } from '../../../adapters/reddit/formatters/binder-item.formatter.js';
import { formatBinderItemForX } from '../../../adapters/x/formatters/binder-item.formatter.js';
import { config } from '../../../config/env.js';
import { ERROR_CODES } from '../../../constants/errors.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const SUPPORTED_PROVIDERS = ['meta', 'linkedin', 'x', 'reddit'];

const formatters = {
  linkedin: formatBinderItemForLinkedIn,
  meta: formatBinderItemForMeta,
  reddit: formatBinderItemForReddit,
  x: formatBinderItemForX,
};

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const getCampaignPreviewParamsSchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS, {
    errorMap: () => ({
      message: 'Provider must be one of: meta, linkedin, x, reddit',
    }),
  }),
  stockNumber: z.string().min(1, 'Stock number is required'),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Get Campaign Preview for Platform
 * GET /social/campaigns/preview
 */
export const getCampaignPreview = async (req, res, next) => {
  try {
    const { provider, stockNumber } = getCampaignPreviewParamsSchema.parse(
      req.params
    );

    logger.info('Campaign preview request', {
      provider,
      requestId: req.id,
      stockNumber,
    });

    // Fetch item from Binder
    const binderAdapter = new BinderAdapter(config);
    const item = await binderAdapter.getItem(stockNumber);

    // Format for the requested provider
    const formatter = formatters[provider];
    const formattedContent = formatter(item);

    logger.info('Campaign preview generated', {
      provider,
      requestId: req.id,
      stockNumber,
    });

    return res.status(200).json({
      formattedContent,
      item,
      provider,
      requestId: req.id,
      stockNumber,
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Campaign preview validation failed', {
        errors: error.errors,
        requestId: req.id,
      });

      return res.status(400).json({
        code: ERROR_CODES.VALIDATION_ERROR,
        errors: error.errors,
        message: 'Request validation failed',
        requestId: req.id,
      });
    }

    logger.error('Campaign preview error', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    next(error);
  }
};
