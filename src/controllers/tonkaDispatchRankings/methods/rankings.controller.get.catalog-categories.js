import {
  RANKING_FIELDS,
  RANKINGS_ERROR_CODE,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchRanking from '../../../models/tonkaDispatchRankings.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * List ranking categories with article counts for catalog picker chips
 * GET /api/dispatch/rankings/catalog/categories
 */
export async function listCatalogCategories(req, res) {
  try {
    logger.info('Listing ranking catalog categories', {
      requestId: req.id,
    });

    const categories = await TonkaDispatchRanking.aggregate([
      {
        $match: {
          [RANKING_FIELDS.CATEGORY]: {
            $exists: true,
            $nin: ['', null],
          },
        },
      },
      {
        $group: {
          _id: `$${RANKING_FIELDS.CATEGORY}`,
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          count: 1,
        },
      },
      {
        $sort: {
          category: 1,
        },
      },
    ]);

    logger.info('Ranking catalog categories retrieved successfully', {
      categoriesCount: categories.length,
      requestId: req.id,
    });

    return res.status(200).json({
      categories,
      requestId: req.id,
    });
  } catch (error) {
    logger.error('Failed to list ranking catalog categories', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: RANKINGS_ERROR_CODE.RANKINGS_LIST_FAILED,
      message: 'Failed to retrieve ranking catalog categories',
      requestId: req.id,
    });
  }
}