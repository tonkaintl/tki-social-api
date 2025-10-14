import express from 'express';

import { BinderAdapter } from '../adapters/binder/binder.adapter.js';
import { formatBinderItemForLinkedIn } from '../adapters/linkedin/formatters/binder-item.formatter.js';
import { formatBinderItemForMeta } from '../adapters/meta/formatters/binder-item.formatter.js';
import { formatBinderItemForReddit } from '../adapters/reddit/formatters/binder-item.formatter.js';
import { formatBinderItemForX } from '../adapters/x/formatters/binder-item.formatter.js';
import { config } from '../config/env.js';
import { verifyToken } from '../middleware/auth.bearer.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const binderAdapter = new BinderAdapter(config);

const formatters = {
  linkedin: formatBinderItemForLinkedIn,
  meta: formatBinderItemForMeta,
  reddit: formatBinderItemForReddit,
  x: formatBinderItemForX,
};

/**
 * GET /api/inventory/item/:stockNumber
 * Fetch an item and format it for a social platform
 * Path param: stockNumber (required)
 * Query param: provider (required) - meta, linkedin, x, reddit
 */
router.get('/item/:stockNumber', verifyToken, async (req, res, next) => {
  try {
    const { stockNumber } = req.params;
    const { provider } = req.query;

    if (!provider) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message:
          'provider query parameter is required (meta, linkedin, x, reddit)',
        requestId: req.id,
      });
    }

    logger.info('Fetching item from binder', {
      provider,
      requestId: req.id,
      stockNumber,
    });

    // Fetch item from binder
    const item = await binderAdapter.getItem(stockNumber);

    // Apply formatter
    const formatter = formatters[provider];
    if (!formatter) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: `Invalid provider. Must be one of: ${Object.keys(formatters).join(', ')}`,
        requestId: req.id,
      });
    }

    const formattedContent = formatter(item);

    return res.json({
      formattedContent,
      item,
      provider,
      requestId: req.id,
      stockNumber,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
