import {
  FEED_ERROR_CODE,
  FEED_FIELDS,
  FEED_SORT_FIELD_VALUES,
  FEED_TIER_VALUES,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchRssLinks from '../../../models/tonkaDispatchRssLinks.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * List feeds with optional filtering and sorting
 */
export async function listFeeds(req, res) {
  try {
    const { category, enabled, sort, tier } = req.query;

    // Build filter object
    const filter = {};

    if (tier) {
      if (!FEED_TIER_VALUES.includes(tier)) {
        logger.warn('Invalid tier filter value', {
          requestId: req.id,
          tier,
        });

        return res.status(400).json({
          code: FEED_ERROR_CODE.INVALID_TIER,
          message: `Tier must be one of: ${FEED_TIER_VALUES.join(', ')}`,
          requestId: req.id,
        });
      }
      filter[FEED_FIELDS.TIER] = tier;
    }

    if (category) {
      filter[FEED_FIELDS.CATEGORY] = category;
    }

    if (enabled !== undefined) {
      // Convert string to boolean
      filter[FEED_FIELDS.ENABLED] = enabled === 'true';
    }

    // Parse sort parameter
    let sortObj = { [FEED_FIELDS.DINNER_SCORE]: -1 }; // Default: highest score first

    if (sort) {
      if (!FEED_SORT_FIELD_VALUES.includes(sort)) {
        logger.warn('Invalid sort field', {
          requestId: req.id,
          sort,
        });

        return res.status(400).json({
          code: FEED_ERROR_CODE.INVALID_SORT_FIELD,
          message: `Sort must be one of: ${FEED_SORT_FIELD_VALUES.join(', ')}`,
          requestId: req.id,
        });
      }

      // Convert sort string to Mongoose format
      if (sort.startsWith('-')) {
        sortObj = { [sort.substring(1)]: -1 };
      } else {
        sortObj = { [sort]: 1 };
      }
    }

    logger.info('Listing feeds', {
      filter,
      requestId: req.id,
      sort: sortObj,
    });

    // Query database
    const feeds = await TonkaDispatchRssLinks.find(filter).sort(sortObj);

    logger.info('Feeds retrieved successfully', {
      count: feeds.length,
      filter,
      requestId: req.id,
    });

    return res.status(200).json({
      count: feeds.length,
      feeds,
      filters: filter,
      requestId: req.id,
    });
  } catch (error) {
    logger.error('Failed to list feeds', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: FEED_ERROR_CODE.FEED_LIST_FAILED,
      message: 'Failed to retrieve feeds',
      requestId: req.id,
    });
  }
}
