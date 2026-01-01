import {
  NEWSLETTER_ERROR_CODE,
  NEWSLETTER_FIELDS,
  NEWSLETTER_PAGINATION,
  NEWSLETTER_SORT_FIELD_VALUES,
  NEWSLETTER_STATUS_VALUES,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchNewsletter from '../../../models/tonkaDispatchNewsletters.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * List newsletters with optional filtering, searching, sorting, and pagination
 * GET /api/dispatch/newsletters
 */
export async function listNewsletters(req, res) {
  try {
    const { limit, page, search, sort, source_batch_id, status } = req.query;

    // Build filter object
    const filter = {};

    if (status) {
      if (!NEWSLETTER_STATUS_VALUES.includes(status)) {
        logger.warn('Invalid status filter value', {
          requestId: req.id,
          status,
        });

        return res.status(400).json({
          code: NEWSLETTER_ERROR_CODE.INVALID_STATUS,
          message: `Status must be one of: ${NEWSLETTER_STATUS_VALUES.join(', ')}`,
          requestId: req.id,
        });
      }
      filter[NEWSLETTER_FIELDS.STATUS] = status;
    }

    if (source_batch_id) {
      filter[NEWSLETTER_FIELDS.SOURCE_BATCH_ID] = source_batch_id;
    }

    // Add search filter (case-insensitive, searches title)
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter[NEWSLETTER_FIELDS.TITLE] = searchRegex;
    }

    // Parse pagination parameters
    const pageNum = parseInt(page, 10) || NEWSLETTER_PAGINATION.DEFAULT_PAGE;
    const limitNum = Math.min(
      parseInt(limit, 10) || NEWSLETTER_PAGINATION.DEFAULT_LIMIT,
      NEWSLETTER_PAGINATION.MAX_LIMIT
    );
    const skip = (pageNum - 1) * limitNum;

    if (pageNum < 1) {
      logger.warn('Invalid page number', {
        page: pageNum,
        requestId: req.id,
      });

      return res.status(400).json({
        code: NEWSLETTER_ERROR_CODE.INVALID_PAGE,
        message: 'Page number must be at least 1',
        requestId: req.id,
      });
    }

    // Parse sort parameter
    let sortObj = { [NEWSLETTER_FIELDS.CREATED_AT]: -1 }; // Default: newest first

    if (sort) {
      if (!NEWSLETTER_SORT_FIELD_VALUES.includes(sort)) {
        logger.warn('Invalid sort field', {
          requestId: req.id,
          sort,
        });

        return res.status(400).json({
          code: NEWSLETTER_ERROR_CODE.INVALID_SORT_FIELD,
          message: `Sort must be one of: ${NEWSLETTER_SORT_FIELD_VALUES.join(', ')}`,
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

    logger.info('Listing newsletters', {
      filter,
      limit: limitNum,
      page: pageNum,
      requestId: req.id,
      sort: sortObj,
    });

    // Get total count for pagination
    const totalCount = await TonkaDispatchNewsletter.countDocuments(filter);

    // Query database with pagination
    const newsletters = await TonkaDispatchNewsletter.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(totalCount / limitNum);

    logger.info('Newsletters retrieved successfully', {
      count: newsletters.length,
      filter,
      page: pageNum,
      requestId: req.id,
      totalCount,
    });

    return res.status(200).json({
      count: newsletters.length,
      filters: {
        ...(status && { status }),
        ...(source_batch_id && { source_batch_id }),
        ...(search && { search }),
      },
      newsletters,
      page: pageNum,
      requestId: req.id,
      totalCount,
      totalPages,
    });
  } catch (error) {
    logger.error('Failed to list newsletters', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: NEWSLETTER_ERROR_CODE.NEWSLETTER_LIST_FAILED,
      message: 'Failed to retrieve newsletters',
      requestId: req.id,
    });
  }
}
