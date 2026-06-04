import {
  ARTICLE_STATE,
  ARTICLE_STATE_VALUES,
  ARTICLES_ERROR_CODE,
  ARTICLES_FIELDS,
  ARTICLES_PAGINATION,
  ARTICLES_SORT_FIELD_VALUES,
} from '../../../constants/tonkaDispatch.js';
import DispatchArticle from '../../../models/dispatchArticle.model.js';
import TonkaDispatchRssLinks from '../../../models/tonkaDispatchRssLinks.model.js';
import { logger } from '../../../utils/logger.js';
import {
  articleStateStages,
  buildArticleBaseMatch,
} from '../util/articleStateAggregation.js';

const RSS_LINKS_COLLECTION = TonkaDispatchRssLinks.collection.collectionName;

// Content fields can be large (full article body); trim for list payloads.
const MAX_CONTENT_LENGTH = 2000;
const MAX_SNIPPET_LENGTH = 500;

/**
 * List dispatch articles with their derived ranked/used/unranked state.
 *
 * dispatch_articles is the source of truth; each row is joined to its ranking
 * (if any) to expose `state`, `ranking_id`, `ai_enrichment_status`,
 * `ai_summary`, and `used_in_newsletter_id`. Supports filtering by state,
 * category, publish-date range, relevance-score range, search, plus sorting
 * and pagination.
 *
 * GET /api/dispatch/articles
 */
export async function listArticles(req, res) {
  try {
    const {
      category,
      exclude_used,
      limit,
      page,
      publish_end,
      publish_start,
      score_max,
      score_min,
      search,
      sort,
      state,
    } = req.query;

    // ── Validate state ──────────────────────────────────────────────────────
    // Back-compat: the old `exclude_used=true` meant "only articles not in any
    // ranking", which is exactly the new `state=unranked`. Honor it when no
    // explicit state is supplied.
    let stateFilter = state;
    if (!stateFilter && exclude_used === 'true') {
      stateFilter = ARTICLE_STATE.UNRANKED;
    }

    if (stateFilter && !ARTICLE_STATE_VALUES.includes(stateFilter)) {
      logger.warn('Invalid article state filter', {
        requestId: req.id,
        state: stateFilter,
      });

      return res.status(400).json({
        code: ARTICLES_ERROR_CODE.INVALID_STATE,
        message: `state must be one of: ${ARTICLE_STATE_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }

    // ── Validate publish-date range ─────────────────────────────────────────
    let publishStartMs;
    let publishEndMs;

    if (publish_start !== undefined) {
      publishStartMs = parseInt(publish_start, 10);
      if (isNaN(publishStartMs)) {
        return res.status(400).json({
          code: ARTICLES_ERROR_CODE.INVALID_DATE_RANGE,
          message: 'publish_start must be a valid timestamp in milliseconds',
          requestId: req.id,
        });
      }
    }

    if (publish_end !== undefined) {
      publishEndMs = parseInt(publish_end, 10);
      if (isNaN(publishEndMs)) {
        return res.status(400).json({
          code: ARTICLES_ERROR_CODE.INVALID_DATE_RANGE,
          message: 'publish_end must be a valid timestamp in milliseconds',
          requestId: req.id,
        });
      }
    }

    // ── Validate relevance-score range ──────────────────────────────────────
    let scoreMin;
    let scoreMax;

    if (score_min !== undefined) {
      scoreMin = parseFloat(score_min);
      if (isNaN(scoreMin) || scoreMin < -1 || scoreMin > 100) {
        return res.status(400).json({
          code: ARTICLES_ERROR_CODE.INVALID_SCORE_RANGE,
          message: 'score_min must be a number between -1 and 100',
          requestId: req.id,
        });
      }
    }

    if (score_max !== undefined) {
      scoreMax = parseFloat(score_max);
      if (isNaN(scoreMax) || scoreMax < -1 || scoreMax > 100) {
        return res.status(400).json({
          code: ARTICLES_ERROR_CODE.INVALID_SCORE_RANGE,
          message: 'score_max must be a number between -1 and 100',
          requestId: req.id,
        });
      }
    }

    // ── Pagination (limit=0 means "return all") ─────────────────────────────
    const pageNum = parseInt(page, 10) || ARTICLES_PAGINATION.DEFAULT_PAGE;

    if (pageNum < 1) {
      return res.status(400).json({
        code: ARTICLES_ERROR_CODE.INVALID_PAGE,
        message: 'Page number must be at least 1',
        requestId: req.id,
      });
    }

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

    // ── Sort ────────────────────────────────────────────────────────────────
    let sortObj = { [ARTICLES_FIELDS.PUBLISHED_AT_MS]: -1 }; // Default: newest

    if (sort) {
      if (!ARTICLES_SORT_FIELD_VALUES.includes(sort)) {
        return res.status(400).json({
          code: ARTICLES_ERROR_CODE.INVALID_SORT_FIELD,
          message: `Sort must be one of: ${ARTICLES_SORT_FIELD_VALUES.join(', ')}`,
          requestId: req.id,
        });
      }
      sortObj = sort.startsWith('-')
        ? { [sort.substring(1)]: -1 }
        : { [sort]: 1 };
    }

    // ── Build aggregation ───────────────────────────────────────────────────
    const baseMatch = buildArticleBaseMatch({
      category,
      publishEndMs,
      publishStartMs,
      scoreMax,
      scoreMin,
      search,
    });

    // Page sub-pipeline: sort → page → populate rss feed (only for the page).
    const dataStages = [{ $sort: sortObj }];
    if (limitNum !== 0) {
      dataStages.push({ $skip: skip }, { $limit: limitNum });
    }
    dataStages.push(
      {
        $lookup: {
          as: 'rss_link_id',
          foreignField: '_id',
          from: RSS_LINKS_COLLECTION,
          localField: ARTICLES_FIELDS.RSS_LINK_ID,
        },
      },
      { $addFields: { rss_link_id: { $first: '$rss_link_id' } } }
    );

    const pipeline = [
      { $match: baseMatch },
      ...articleStateStages(),
      ...(stateFilter ? [{ $match: { state: stateFilter } }] : []),
      {
        $facet: {
          categoryDistribution: [
            {
              $group: {
                _id: {
                  $ifNull: [`$${ARTICLES_FIELDS.CATEGORY}`, 'uncategorized'],
                },
                count: { $sum: 1 },
              },
            },
          ],
          data: dataStages,
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    logger.info('Listing dispatch articles', {
      limit: limitNum,
      page: pageNum,
      requestId: req.id,
      sort: sortObj,
      state: stateFilter,
    });

    const [result] = await DispatchArticle.aggregate(pipeline);
    const totalCount = result?.totalCount?.[0]?.count ?? 0;
    const articles = result?.data ?? [];
    const totalPages = limitNum === 0 ? 1 : Math.ceil(totalCount / limitNum);

    // Truncate heavy content fields for the list payload.
    const truncatedArticles = articles.map(article => {
      if (article.content && article.content.length > MAX_CONTENT_LENGTH) {
        article.content =
          article.content.substring(0, MAX_CONTENT_LENGTH) +
          '... [content truncated]';
      }
      if (
        article.content_snippet &&
        article.content_snippet.length > MAX_SNIPPET_LENGTH
      ) {
        article.content_snippet =
          article.content_snippet.substring(0, MAX_SNIPPET_LENGTH) +
          '... [truncated]';
      }
      return article;
    });

    const categoryDistribution = (result?.categoryDistribution ?? []).reduce(
      (acc, item) => {
        acc[item._id] = item.count;
        return acc;
      },
      {}
    );

    logger.info('Dispatch articles retrieved successfully', {
      count: truncatedArticles.length,
      page: pageNum,
      requestId: req.id,
      state: stateFilter,
      totalCount,
    });

    return res.status(200).json({
      articles: truncatedArticles,
      categoryDistribution,
      count: truncatedArticles.length,
      filters: {
        ...(category && { category }),
        ...(stateFilter && { state: stateFilter }),
        ...(publish_start && { publish_start: publishStartMs }),
        ...(publish_end && { publish_end: publishEndMs }),
        ...(scoreMin !== undefined && { score_min: scoreMin }),
        ...(scoreMax !== undefined && { score_max: scoreMax }),
        ...(search && { search }),
      },
      page: pageNum,
      requestId: req.id,
      totalCount,
      totalPages,
    });
  } catch (error) {
    logger.error('Failed to list dispatch articles', {
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
