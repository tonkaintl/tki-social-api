import {
  RANKING_FIELDS,
  RANKING_PAGINATION,
  RANKINGS_ERROR_CODE,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchRanking from '../../../models/tonkaDispatchRankings.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * List paginated ranking articles for a specific category in the picker catalog
 * GET /api/dispatch/rankings/catalog/articles?category=...&page=1&limit=25
 */
export async function listCatalogArticles(req, res) {
  try {
    const { category, limit, page } = req.query;

    if (!category || category.trim() === '') {
      logger.warn('Missing category for ranking catalog articles', {
        requestId: req.id,
      });

      return res.status(400).json({
        code: RANKINGS_ERROR_CODE.INVALID_PAYLOAD,
        message: 'category query param is required',
        requestId: req.id,
      });
    }

    const pageNum = parseInt(page, 10) || RANKING_PAGINATION.DEFAULT_PAGE;
    const limitNum = Math.min(
      parseInt(limit, 10) || RANKING_PAGINATION.DEFAULT_LIMIT,
      RANKING_PAGINATION.MAX_LIMIT
    );

    if (pageNum < 1) {
      logger.warn('Invalid page number for ranking catalog articles', {
        page: pageNum,
        requestId: req.id,
      });

      return res.status(400).json({
        code: RANKINGS_ERROR_CODE.INVALID_PAGE,
        message: 'Page number must be at least 1',
        requestId: req.id,
      });
    }

    const skip = (pageNum - 1) * limitNum;
    const normalizedCategory = category.trim();

    const filter = {
      [RANKING_FIELDS.CATEGORY]: normalizedCategory,
    };

    logger.info('Listing ranking catalog articles', {
      category: normalizedCategory,
      limit: limitNum,
      page: pageNum,
      requestId: req.id,
    });

    const totalCount = await TonkaDispatchRanking.countDocuments(filter);

    const articles = await TonkaDispatchRanking.find(filter)
      .select({
        [RANKING_FIELDS.CATEGORY]: 1,
        [RANKING_FIELDS.CREATOR]: 1,
        [RANKING_FIELDS.LINK]: 1,
        [RANKING_FIELDS.OG_IMAGE_URL]: 1,
        [RANKING_FIELDS.PUB_DATE_MS]: 1,
        [RANKING_FIELDS.RANK]: 1,
        [RANKING_FIELDS.SNIPPET]: 1,
        [RANKING_FIELDS.SOURCE_NAME]: 1,
        [RANKING_FIELDS.TITLE]: 1,
      })
      .sort({
        _id: 1,
        [RANKING_FIELDS.CREATED_AT]: -1,
        [RANKING_FIELDS.PUB_DATE_MS]: -1,
        [RANKING_FIELDS.RANK]: 1,
      })
      .skip(skip)
      .limit(limitNum);

    const hasMore = pageNum * limitNum < totalCount;

    logger.info('Ranking catalog articles retrieved successfully', {
      category: normalizedCategory,
      count: articles.length,
      hasMore,
      page: pageNum,
      requestId: req.id,
      totalCount,
    });

    return res.status(200).json({
      articles,
      pagination: {
        hasMore,
        limit: limitNum,
        page: pageNum,
        totalCount,
      },
      requestId: req.id,
    });
  } catch (error) {
    logger.error('Failed to list ranking catalog articles', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: RANKINGS_ERROR_CODE.RANKINGS_LIST_FAILED,
      message: 'Failed to retrieve ranking catalog articles',
      requestId: req.id,
    });
  }
}
