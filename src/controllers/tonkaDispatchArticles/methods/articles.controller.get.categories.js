import {
  ARTICLE_STATE_VALUES,
  ARTICLES_ERROR_CODE,
  ARTICLES_FIELDS,
} from '../../../constants/tonkaDispatch.js';
import DispatchArticle from '../../../models/dispatchArticle.model.js';
import { logger } from '../../../utils/logger.js';
import {
  articleStateStages,
  buildArticleBaseMatch,
} from '../util/articleStateAggregation.js';

/**
 * List article categories with counts for the filter chips. Counts are scoped
 * to the currently-selected `state` (ranked/used/unranked) and optional search
 * so the chips reflect what the list will actually show. Category itself is NOT
 * applied to the match — every category chip is always returned.
 *
 * GET /api/dispatch/articles/categories?state=ranked&search=...
 */
export async function listArticleCategories(req, res) {
  try {
    const { search, state } = req.query;

    if (state && !ARTICLE_STATE_VALUES.includes(state)) {
      logger.warn('Invalid article state filter for categories', {
        requestId: req.id,
        state,
      });

      return res.status(400).json({
        code: ARTICLES_ERROR_CODE.INVALID_STATE,
        message: `state must be one of: ${ARTICLE_STATE_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }

    const baseMatch = buildArticleBaseMatch({ includeCategory: false, search });

    const pipeline = [
      { $match: baseMatch },
      ...articleStateStages(),
      ...(state ? [{ $match: { state } }] : []),
      {
        $group: {
          _id: { $ifNull: [`$${ARTICLES_FIELDS.CATEGORY}`, 'uncategorized'] },
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
      { $sort: { category: 1 } },
    ];

    logger.info('Listing dispatch article categories', {
      requestId: req.id,
      state,
    });

    const categories = await DispatchArticle.aggregate(pipeline);

    logger.info('Dispatch article categories retrieved successfully', {
      categoriesCount: categories.length,
      requestId: req.id,
      state,
    });

    return res.status(200).json({
      categories,
      requestId: req.id,
      ...(state && { state }),
    });
  } catch (error) {
    logger.error('Failed to list dispatch article categories', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: ARTICLES_ERROR_CODE.ARTICLES_LIST_FAILED,
      message: 'Failed to retrieve article categories',
      requestId: req.id,
    });
  }
}
