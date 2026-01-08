import {
  ARTICLES_ERROR_CODE,
  ARTICLES_FIELDS,
  ARTICLES_PAGINATION,
  ARTICLES_SORT_FIELD_VALUES,
} from '../../../constants/tonkaDispatch.js';
import DispatchArticle from '../../../models/dispatchArticle.model.js';
import TonkaDispatchRanking from '../../../models/tonkaDispatchRankings.model.js';

/**
 * List dispatch articles with optional filtering, searching, sorting, and pagination
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
    } = req.query;

    // Build filter object
    const filter = {};

    // Exclude articles already used in rankings
    if (exclude_used === 'true') {
      const usedArticleIds = await TonkaDispatchRanking.distinct(
        'dispatch_article_id'
      );
      // Filter out null values and ensure we have valid ObjectIds
      const validIds = usedArticleIds.filter(id => id !== null);

      console.log('[ARTICLES] ========================================');
      console.log('[ARTICLES] EXCLUDE_USED=TRUE - IDs TO EXCLUDE:');
      console.log(
        '[ARTICLES] Total distinct IDs from rankings:',
        usedArticleIds.length
      );
      console.log('[ARTICLES] Valid (non-null) IDs:', validIds.length);
      console.log(
        '[ARTICLES] Null IDs:',
        usedArticleIds.length - validIds.length
      );
      console.log(
        '[ARTICLES] IDs being excluded:',
        validIds.map(id => id.toString())
      );
      console.log('[ARTICLES] ========================================');

      if (validIds.length > 0) {
        filter[ARTICLES_FIELDS.ID] = { $nin: validIds };
      }
    }

    if (category) {
      filter[ARTICLES_FIELDS.CATEGORY] = category;
    }

    // Publish date range filter (using published_at_ms)
    if (publish_start || publish_end) {
      filter[ARTICLES_FIELDS.PUBLISHED_AT_MS] = {};

      if (publish_start) {
        const startMs = parseInt(publish_start, 10);
        if (isNaN(startMs)) {
          console.log('[ARTICLES] Invalid publish_start:', publish_start);

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
          console.log('[ARTICLES] Invalid publish_end:', publish_end);

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
          console.log('[ARTICLES] Invalid score_min:', score_min);

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
          console.log('[ARTICLES] Invalid score_max:', score_max);

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
      console.log('[ARTICLES] Invalid page number:', pageNum);

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
        console.log('[ARTICLES] Invalid sort field:', sort);

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

    console.log('[ARTICLES] Listing articles:', {
      filter,
      limit: limitNum,
      page: pageNum,
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

    // Truncate content fields for performance (articles consumed by AI)
    const MAX_CONTENT_LENGTH = 2000;
    const MAX_SNIPPET_LENGTH = 500;
    const truncatedArticles = articles.map(article => {
      const articleObj = article.toObject();

      if (
        articleObj.content &&
        articleObj.content.length > MAX_CONTENT_LENGTH
      ) {
        articleObj.content =
          articleObj.content.substring(0, MAX_CONTENT_LENGTH) +
          '... [content truncated]';
      }

      if (
        articleObj.content_snippet &&
        articleObj.content_snippet.length > MAX_SNIPPET_LENGTH
      ) {
        articleObj.content_snippet =
          articleObj.content_snippet.substring(0, MAX_SNIPPET_LENGTH) +
          '... [truncated]';
      }

      return articleObj;
    });

    // Calculate category distribution summary
    const categoryDistribution = {};
    truncatedArticles.forEach(article => {
      const cat = article.category || 'uncategorized';
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    });

    console.log('[ARTICLES] ========================================');
    console.log('[ARTICLES] RESULTS - ARTICLES BEING RETURNED:');
    console.log('[ARTICLES] Count:', truncatedArticles.length);
    console.log('[ARTICLES] Total available:', totalCount);
    console.log('[ARTICLES] Category distribution:', categoryDistribution);
    console.log(
      '[ARTICLES] Article IDs being returned:',
      truncatedArticles.map(a => a._id.toString())
    );
    console.log('[ARTICLES] ========================================');

    return res.status(200).json({
      articles: truncatedArticles,
      count: truncatedArticles.length,
      filters: {
        ...(category && { category }),
        ...(exclude_used && { exclude_used: exclude_used === 'true' }),
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
    console.log('[ARTICLES] ERROR:', error.message);
    console.log('[ARTICLES] Stack:', error.stack);

    return res.status(500).json({
      code: ARTICLES_ERROR_CODE.ARTICLES_LIST_FAILED,
      message: 'Failed to retrieve articles',
      requestId: req.id,
    });
  }
}
