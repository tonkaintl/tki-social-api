import {
  ARTICLES_ERROR_CODE,
  ARTICLES_FIELDS,
  ARTICLES_PAGINATION,
  ARTICLES_SORT_FIELD_VALUES,
} from '../../../constants/tonkaDispatch.js';
import DispatchArticle from '../../../models/dispatchArticle.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * List dispatch articles with optional filtering, searching, sorting, and pagination
 */
export async function listArticles(req, res) {
  try {
    const {
      category,
      limit,
      page,
      publish_end,
      publish_start,
      score_max,
      score_min,
      search,
      sort,
    } = req.query;

    // Build filter object
    const filter = {};

    if (category) {
      filter[ARTICLES_FIELDS.CATEGORY] = category;
    }

    // Publish date range filter (using published_at_ms)
    if (publish_start || publish_end) {
      filter[ARTICLES_FIELDS.PUBLISHED_AT_MS] = {};

      if (publish_start) {
        const startMs = parseInt(publish_start, 10);
        if (isNaN(startMs)) {
          logger.warn('Invalid publish_start value', {
            publish_start,
            requestId: req.id,
          });

          return res.status(400).json({
            code: ARTICLES_ERROR_CODE.INVALID_DATE_RANGE,
            message: 'publish_start must be a valid timestamp in milliseconds',
            requestId: req.id,
          });
        }
        filter[ARTICLES_FIELDS.PUBLISHED_AT_MS].$gte = startMs;
      }

      if (publish_end) {
        const endMs = parseInt(publish_end, 10);
        if (isNaN(endMs)) {
          logger.warn('Invalid publish_end value', {
            publish_end,
            requestId: req.id,
          });

          return res.status(400).json({
            code: ARTICLES_ERROR_CODE.INVALID_DATE_RANGE,
            message: 'publish_end must be a valid timestamp in milliseconds',
            requestId: req.id,
          });
        }
        filter[ARTICLES_FIELDS.PUBLISHED_AT_MS].$lte = endMs;
      }
    }

    // Score range filter (using relevance.score)
    if (score_min !== undefined || score_max !== undefined) {
      filter[ARTICLES_FIELDS.RELEVANCE_SCORE] = {};

      if (score_min !== undefined) {
        const minScore = parseFloat(score_min);
        if (isNaN(minScore) || minScore < -1 || minScore > 100) {
          logger.warn('Invalid score_min value', {
            requestId: req.id,
            score_min,
          });

          return res.status(400).json({
            code: ARTICLES_ERROR_CODE.INVALID_SCORE_RANGE,
            message: 'score_min must be a number between -1 and 100',
            requestId: req.id,
          });
        }
        filter[ARTICLES_FIELDS.RELEVANCE_SCORE].$gte = minScore;
      }

      if (score_max !== undefined) {
        const maxScore = parseFloat(score_max);
        if (isNaN(maxScore) || maxScore < -1 || maxScore > 100) {
          logger.warn('Invalid score_max value', {
            requestId: req.id,
            score_max,
          });

          return res.status(400).json({
            code: ARTICLES_ERROR_CODE.INVALID_SCORE_RANGE,
            message: 'score_max must be a number between -1 and 100',
            requestId: req.id,
          });
        }
        filter[ARTICLES_FIELDS.RELEVANCE_SCORE].$lte = maxScore;
      }
    }

    // Add search filter (case-insensitive, searches across multiple fields)
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { [ARTICLES_FIELDS.TITLE]: searchRegex },
        { [ARTICLES_FIELDS.AUTHOR]: searchRegex },
        { [ARTICLES_FIELDS.CATEGORY]: searchRegex },
        { [ARTICLES_FIELDS.CONTENT_SNIPPET]: searchRegex },
      ];
    }

    // Parse pagination parameters
    const pageNum = parseInt(page, 10) || ARTICLES_PAGINATION.DEFAULT_PAGE;
    // limit=0 means no limit (return all results)
    let limitNum;
    if (limit === '0' || limit === 0) {
      limitNum = 0;
    } else {
      const parsedLimit = parseInt(limit, 10);
      limitNum = isNaN(parsedLimit)
        ? ARTICLES_PAGINATION.DEFAULT_LIMIT
        : Math.min(parsedLimit, ARTICLES_PAGINATION.MAX_LIMIT);
    }
    const skip = limitNum === 0 ? 0 : (pageNum - 1) * limitNum;

    if (pageNum < 1) {
      logger.warn('Invalid page number', {
        page: pageNum,
        requestId: req.id,
      });

      return res.status(400).json({
        code: ARTICLES_ERROR_CODE.INVALID_PAGE,
        message: 'Page number must be at least 1',
        requestId: req.id,
      });
    }

    // Parse sort parameter
    let sortObj = { [ARTICLES_FIELDS.PUBLISHED_AT_MS]: -1 }; // Default: newest first

    if (sort) {
      if (!ARTICLES_SORT_FIELD_VALUES.includes(sort)) {
        logger.warn('Invalid sort field', {
          requestId: req.id,
          sort,
        });

        return res.status(400).json({
          code: ARTICLES_ERROR_CODE.INVALID_SORT_FIELD,
          message: `Sort must be one of: ${ARTICLES_SORT_FIELD_VALUES.join(', ')}`,
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

    logger.info('Listing articles', {
      filter,
      limit: limitNum,
      page: pageNum,
      requestId: req.id,
      sort: sortObj,
    });

    // Get total count for pagination
    const totalCount = await DispatchArticle.countDocuments(filter);

    // Query database with pagination and populate RSS feed reference
    const query = DispatchArticle.find(filter)
      .sort(sortObj)
      .skip(skip)
      .populate('rss_link_id');

    // Apply limit only if not 0 (0 means return all)
    const articles = limitNum === 0 ? await query : await query.limit(limitNum);

    const totalPages = limitNum === 0 ? 1 : Math.ceil(totalCount / limitNum);

    logger.info('Articles retrieved successfully', {
      count: articles.length,
      filter,
      page: pageNum,
      requestId: req.id,
      totalCount,
    });

    return res.status(200).json({
      articles,
      count: articles.length,
      filters: {
        ...(category && { category }),
        ...(publish_start && { publish_start: parseInt(publish_start, 10) }),
        ...(publish_end && { publish_end: parseInt(publish_end, 10) }),
        ...(score_min !== undefined && { score_min: parseFloat(score_min) }),
        ...(score_max !== undefined && { score_max: parseFloat(score_max) }),
        ...(search && { search }),
      },
      page: pageNum,
      requestId: req.id,
      totalCount,
      totalPages,
    });
  } catch (error) {
    logger.error('Failed to list articles', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: ARTICLES_ERROR_CODE.ARTICLES_LIST_FAILED,
      message: 'Failed to retrieve articles',
      requestId: req.id,
    });
  }
}
