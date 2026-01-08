import {
  ARTICLES_FIELDS,
  FEED_CATEGORY_VALUES,
} from '../../../constants/tonkaDispatch.js';
import DispatchArticle from '../../../models/dispatchArticle.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Fetch articles with balanced distribution across categories
 * Uses smart backfill algorithm to meet target limit even when some categories are short
 *
 * @param {Object} baseFilter - Base MongoDB filter object (excludes category)
 * @param {Object} sortObj - MongoDB sort object
 * @param {number} targetLimit - Total number of articles desired
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<Array>} Array of article documents
 */
export async function fetchBalancedArticles(
  baseFilter,
  sortObj,
  targetLimit,
  requestId
) {
  const MAX_BACKFILL_ITERATIONS = 5;
  const categories = FEED_CATEGORY_VALUES;
  const targetPerCategory = Math.ceil(targetLimit / categories.length);

  logger.info('Starting balanced category fetch', {
    categories: categories.length,
    requestId,
    targetLimit,
    targetPerCategory,
  });

  // Track articles fetched per category
  const categoryResults = new Map();
  const allArticles = [];

  // FIRST PASS: Fetch target amount from each category
  for (const category of categories) {
    const categoryFilter = {
      ...baseFilter,
      [ARTICLES_FIELDS.CATEGORY]: category,
    };

    const articles = await DispatchArticle.find(categoryFilter)
      .sort(sortObj)
      .limit(targetPerCategory)
      .populate('rss_link_id');

    categoryResults.set(category, {
      articles: articles,
      fetched: articles.length,
      target: targetPerCategory,
    });

    allArticles.push(...articles);

    logger.debug('First pass category fetch', {
      category,
      fetched: articles.length,
      requestId,
      target: targetPerCategory,
    });
  }

  const firstPassCount = allArticles.length;
  logger.info('First pass complete', {
    deficit: targetLimit - firstPassCount,
    fetched: firstPassCount,
    requestId,
    target: targetLimit,
  });

  // If we already have enough or more than requested, trim and return
  if (firstPassCount >= targetLimit) {
    const trimmed = allArticles.slice(0, targetLimit);
    logger.info('Target met in first pass', {
      requestId,
      returned: trimmed.length,
    });
    return trimmed;
  }

  // BACKFILL PASSES: Try to fill deficit from categories with available articles
  let currentCount = firstPassCount;
  let iteration = 0;
  const usedArticleIds = new Set(allArticles.map(a => a._id.toString()));

  while (currentCount < targetLimit && iteration < MAX_BACKFILL_ITERATIONS) {
    iteration++;
    let articlesAddedThisIteration = 0;

    logger.debug('Starting backfill iteration', {
      currentCount,
      deficit: targetLimit - currentCount,
      iteration,
      requestId,
    });

    // Cycle through categories and try to fetch one more from each
    for (const category of categories) {
      if (currentCount >= targetLimit) break;

      const categoryFilter = {
        ...baseFilter,
        [ARTICLES_FIELDS.CATEGORY]: category,
        [ARTICLES_FIELDS.ID]: { $nin: Array.from(usedArticleIds) },
      };

      // Fetch one additional article from this category
      const additionalArticles = await DispatchArticle.find(categoryFilter)
        .sort(sortObj)
        .limit(1)
        .populate('rss_link_id');

      if (additionalArticles.length > 0) {
        const article = additionalArticles[0];
        allArticles.push(article);
        usedArticleIds.add(article._id.toString());
        currentCount++;
        articlesAddedThisIteration++;

        const categoryData = categoryResults.get(category);
        categoryData.fetched++;
        categoryData.articles.push(article);

        logger.debug('Backfill article added', {
          category,
          currentCount,
          iteration,
          requestId,
        });
      }
    }

    // Fail-safe: If no articles were added this iteration, we've exhausted the database
    if (articlesAddedThisIteration === 0) {
      logger.info('No more articles available for backfill', {
        currentCount,
        iteration,
        requestId,
        targetLimit,
      });
      break;
    }

    logger.debug('Backfill iteration complete', {
      added: articlesAddedThisIteration,
      currentCount,
      iteration,
      requestId,
    });
  }

  // Final summary
  const categoryDistribution = {};
  for (const [category, data] of categoryResults.entries()) {
    categoryDistribution[category] = data.fetched;
  }

  logger.info('Balanced fetch complete', {
    categoryDistribution,
    iterations: iteration,
    requestId,
    returned: allArticles.length,
    target: targetLimit,
  });

  return allArticles;
}
