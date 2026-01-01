import {
  FEED_MATCH_STATUS_VALUES,
  RANKING_FIELDS,
  RANKING_PAGINATION,
  RANKING_SORT_FIELD_VALUES,
  RANKINGS_ERROR_CODE,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchRanking from '../../../models/tonkaDispatchRankings.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * List rankings with optional filtering, searching, sorting, and pagination
 */
export async function listRankings(req, res) {
  try {
    const {
      batch_id,
      category,
      feed_match_status,
      limit,
      page,
      search,
      sort,
      tonka_dispatch_rss_links_id,
    } = req.query;

    // Build filter object
    const filter = {};

    if (batch_id) {
      filter[RANKING_FIELDS.BATCH_ID] = batch_id;
    }

    if (category) {
      filter[RANKING_FIELDS.CATEGORY] = category;
    }

    if (feed_match_status) {
      if (!FEED_MATCH_STATUS_VALUES.includes(feed_match_status)) {
        logger.warn('Invalid feed_match_status filter value', {
          feed_match_status,
          requestId: req.id,
        });

        return res.status(400).json({
          code: RANKINGS_ERROR_CODE.INVALID_SORT_FIELD,
          message: `feed_match_status must be one of: ${FEED_MATCH_STATUS_VALUES.join(', ')}`,
          requestId: req.id,
        });
      }
      filter[RANKING_FIELDS.FEED_MATCH_STATUS] = feed_match_status;
    }

    if (tonka_dispatch_rss_links_id) {
      filter[RANKING_FIELDS.TONKA_DISPATCH_RSS_LINKS_ID] =
        tonka_dispatch_rss_links_id;
    }

    // Add search filter (case-insensitive, searches across multiple fields)
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { [RANKING_FIELDS.TITLE]: searchRegex },
        { [RANKING_FIELDS.CANONICAL_ID]: searchRegex },
        { [RANKING_FIELDS.SOURCE_NAME]: searchRegex },
        { [RANKING_FIELDS.CATEGORY]: searchRegex },
        { [RANKING_FIELDS.SNIPPET]: searchRegex },
      ];
    }

    // Parse pagination parameters
    const pageNum = parseInt(page, 10) || RANKING_PAGINATION.DEFAULT_PAGE;
    const limitNum = Math.min(
      parseInt(limit, 10) || RANKING_PAGINATION.DEFAULT_LIMIT,
      RANKING_PAGINATION.MAX_LIMIT
    );
    const skip = (pageNum - 1) * limitNum;

    if (pageNum < 1) {
      logger.warn('Invalid page number', {
        page: pageNum,
        requestId: req.id,
      });

      return res.status(400).json({
        code: RANKINGS_ERROR_CODE.INVALID_PAGE,
        message: 'Page number must be at least 1',
        requestId: req.id,
      });
    }

    // Parse sort parameter
    let sortObj = {
      [RANKING_FIELDS.CREATED_AT]: -1,
      [RANKING_FIELDS.RANK]: 1,
    }; // Default: newest first, then by rank

    if (sort) {
      if (!RANKING_SORT_FIELD_VALUES.includes(sort)) {
        logger.warn('Invalid sort field', {
          requestId: req.id,
          sort,
        });

        return res.status(400).json({
          code: RANKINGS_ERROR_CODE.INVALID_SORT_FIELD,
          message: `Sort must be one of: ${RANKING_SORT_FIELD_VALUES.join(', ')}`,
          requestId: req.id,
        });
      }

      // Convert sort string to Mongoose format
      if (sort.startsWith('-')) {
        sortObj = {
          [RANKING_FIELDS.RANK]: 1,
          [sort.substring(1)]: -1,
        };
      } else {
        sortObj = {
          [RANKING_FIELDS.RANK]: 1,
          [sort]: 1,
        };
      }
    }

    logger.info('Listing rankings', {
      filter,
      limit: limitNum,
      page: pageNum,
      requestId: req.id,
      sort: sortObj,
    });

    // Get total count for pagination
    const totalCount = await TonkaDispatchRanking.countDocuments(filter);

    // Query database with pagination
    const rankings = await TonkaDispatchRanking.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(totalCount / limitNum);

    // Group by batch_id for metadata
    const batches = {};
    rankings.forEach(ranking => {
      if (!batches[ranking.batch_id]) {
        batches[ranking.batch_id] = 0;
      }
      batches[ranking.batch_id]++;
    });

    logger.info('Rankings retrieved successfully', {
      batches: Object.keys(batches).length,
      count: rankings.length,
      filter,
      page: pageNum,
      requestId: req.id,
      totalCount,
    });

    return res.status(200).json({
      batches: Object.keys(batches).length,
      count: rankings.length,
      filters: {
        ...(batch_id && { batch_id }),
        ...(category && { category }),
        ...(feed_match_status && { feed_match_status }),
        ...(tonka_dispatch_rss_links_id && { tonka_dispatch_rss_links_id }),
        ...(search && { search }),
      },
      page: pageNum,
      rankings,
      requestId: req.id,
      totalCount,
      totalPages,
    });
  } catch (error) {
    logger.error('Failed to list rankings', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: RANKINGS_ERROR_CODE.RANKINGS_LIST_FAILED,
      message: 'Failed to retrieve rankings',
      requestId: req.id,
    });
  }
}
