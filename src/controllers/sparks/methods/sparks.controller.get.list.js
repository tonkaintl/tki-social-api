import {
  SPARK_ERROR_CODE,
  SPARK_FIELDS,
  SPARK_GROUP_VALUES,
  SPARK_PAGINATION,
  SPARK_SORT_FIELD_VALUES,
} from '../../../constants/sparks.js';
import { FEED_CATEGORY_VALUES } from '../../../constants/tonkaDispatch.js';
import Sparks from '../../../models/sparks.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * List sparks with optional filtering, searching, sorting, and pagination
 */
export async function listSparks(req, res) {
  try {
    const { category, group, limit, page, search, sort } = req.query;

    // Build filter object
    const filter = {};

    if (category) {
      if (!FEED_CATEGORY_VALUES.includes(category)) {
        logger.warn('Invalid category filter value', {
          category,
          requestId: req.id,
        });

        return res.status(400).json({
          code: SPARK_ERROR_CODE.INVALID_CATEGORY,
          message: `Category must be one of: ${FEED_CATEGORY_VALUES.join(', ')}`,
          requestId: req.id,
        });
      }
      filter[SPARK_FIELDS.CATEGORIES] = category;
    }

    if (group) {
      if (!SPARK_GROUP_VALUES.includes(group)) {
        logger.warn('Invalid group filter value', {
          group,
          requestId: req.id,
        });

        return res.status(400).json({
          code: SPARK_ERROR_CODE.INVALID_GROUP,
          message: `Group must be one of: ${SPARK_GROUP_VALUES.join(', ')}`,
          requestId: req.id,
        });
      }
      filter[SPARK_FIELDS.GROUP] = group;
    }

    // Add search filter (case-insensitive, searches across multiple fields)
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { [SPARK_FIELDS.SECTION]: searchRegex },
        { [SPARK_FIELDS.CONCEPT]: searchRegex },
        { [SPARK_FIELDS.THESIS]: searchRegex },
        { [SPARK_FIELDS.GROUP]: searchRegex },
      ];
    }

    // Parse pagination parameters
    const pageNum = parseInt(page, 10) || SPARK_PAGINATION.DEFAULT_PAGE;
    // limit=0 means no limit (return all results)
    let limitNum;
    if (limit === '0' || limit === 0) {
      limitNum = 0;
    } else {
      const parsedLimit = parseInt(limit, 10);
      limitNum = isNaN(parsedLimit)
        ? SPARK_PAGINATION.DEFAULT_LIMIT
        : Math.min(parsedLimit, SPARK_PAGINATION.MAX_LIMIT);
    }
    const skip = limitNum === 0 ? 0 : (pageNum - 1) * limitNum;

    if (pageNum < 1) {
      logger.warn('Invalid page number', {
        page: pageNum,
        requestId: req.id,
      });

      return res.status(400).json({
        code: SPARK_ERROR_CODE.INVALID_PAGE,
        message: 'Page number must be at least 1',
        requestId: req.id,
      });
    }

    // Parse sort parameter
    let sortObj = { [SPARK_FIELDS.CREATED_AT]: -1 }; // Default: newest first

    if (sort) {
      if (!SPARK_SORT_FIELD_VALUES.includes(sort)) {
        logger.warn('Invalid sort field', {
          requestId: req.id,
          sort,
        });

        return res.status(400).json({
          code: SPARK_ERROR_CODE.INVALID_SORT_FIELD,
          message: `Sort must be one of: ${SPARK_SORT_FIELD_VALUES.join(', ')}`,
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

    logger.info('Listing sparks', {
      filter,
      limit: limitNum,
      page: pageNum,
      requestId: req.id,
      sort: sortObj,
    });

    // Get total count for pagination
    const totalCount = await Sparks.countDocuments(filter);

    // Query database with pagination
    const query = Sparks.find(filter).sort(sortObj).skip(skip);

    // Apply limit only if not 0 (0 means return all)
    const sparks = limitNum === 0 ? await query : await query.limit(limitNum);

    const totalPages = limitNum === 0 ? 1 : Math.ceil(totalCount / limitNum);

    logger.info('Sparks retrieved successfully', {
      count: sparks.length,
      filter,
      page: pageNum,
      requestId: req.id,
      totalCount,
    });

    return res.status(200).json({
      count: sparks.length,
      filters: {
        ...(category && { category }),
        ...(group && { group }),
        ...(search && { search }),
      },
      page: pageNum,
      requestId: req.id,
      sparks,
      totalCount,
      totalPages,
    });
  } catch (error) {
    logger.error('Failed to List sparks', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: SPARK_ERROR_CODE.SPARK_LIST_FAILED,
      message: 'Failed to retrieve sparks',
      requestId: req.id,
    });
  }
}
