import {
  FEED_ERROR_CODE,
  FEED_FIELDS,
  FEED_PAGINATION,
  FEED_SORT_FIELD_VALUES,
  FEED_TIER_VALUES,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchRssLinks from '../../../models/tonkaDispatchRssLinks.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * List feeds with optional filtering, searching, sorting, and pagination
 */
export async function listFeeds(req, res) {
  try {
    const { category, enabled, limit, page, search, sort, tier } = req.query;

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

    // Only filter by enabled if explicitly set to 'true' or 'false'
    // null, undefined, or empty string returns both enabled and disabled
    if (enabled !== undefined && enabled !== null && enabled !== '') {
      filter[FEED_FIELDS.ENABLED] = enabled === 'true';
    }

    // Add search filter (case-insensitive, searches across multiple fields)
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { [FEED_FIELDS.NAME]: searchRegex },
        { [FEED_FIELDS.RSS_URL]: searchRegex },
        { [FEED_FIELDS.CATEGORY]: searchRegex },
        { [FEED_FIELDS.TIER]: searchRegex },
        { [FEED_FIELDS.NOTES]: searchRegex },
      ];
    }

    // Parse pagination parameters
    const pageNum = parseInt(page, 10) || FEED_PAGINATION.DEFAULT_PAGE;
    // limit=0 means no limit (return all results)
    const limitNum =
      limit === '0' || limit === 0
        ? 0
        : Math.min(
            parseInt(limit, 10) || FEED_PAGINATION.DEFAULT_LIMIT,
            FEED_PAGINATION.MAX_LIMIT
          );
    const skip = limitNum === 0 ? 0 : (pageNum - 1) * limitNum;

    if (pageNum < 1) {
      logger.warn('Invalid page number', {
        page: pageNum,
        requestId: req.id,
      });

      return res.status(400).json({
        code: FEED_ERROR_CODE.INVALID_PAGE,
        message: 'Page number must be at least 1',
        requestId: req.id,
      });
    }

    // Parse sort parameter
    let sortObj = { [FEED_FIELDS.CREATED_AT]: -1 }; // Default: newest first

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
      limit: limitNum,
      page: pageNum,
      requestId: req.id,
      sort: sortObj,
    });

    // Get total count for pagination
    const totalCount = await TonkaDispatchRssLinks.countDocuments(filter);

    // Query database with pagination
    const query = TonkaDispatchRssLinks.find(filter).sort(sortObj).skip(skip);

    // Apply limit only if not 0 (0 means return all)
    const feeds = limitNum === 0 ? await query : await query.limit(limitNum);

    const totalPages = limitNum === 0 ? 1 : Math.ceil(totalCount / limitNum);

    logger.info('Feeds retrieved successfully', {
      count: feeds.length,
      filter,
      page: pageNum,
      requestId: req.id,
      totalCount,
    });

    return res.status(200).json({
      count: feeds.length,
      feeds,
      filters: {
        ...(tier && { tier }),
        ...(category && { category }),
        ...(enabled !== undefined && { enabled: enabled === 'true' }),
        ...(search && { search }),
      },
      page: pageNum,
      requestId: req.id,
      totalCount,
      totalPages,
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
