import {
  ARTICLES_FIELDS,
  FEED_CATEGORY_VALUES,
} from '../../../constants/tonkaDispatch.js';
import DispatchArticle from '../../../models/dispatchArticle.model.js';

/**
 * Fetch articles with balanced distribution across categories
 * Uses smart backfill algorithm to meet target limit even when some categories are short
 *
 * @param {Object} baseFilter - Base MongoDB filter object (excludes category)
 * @param {Object} sortObj - MongoDB sort object
 * @param {number} targetLimit - Total number of articles desired
 * @returns {Promise<Array>} Array of article documents
 */
export async function fetchBalancedArticles(baseFilter, sortObj, targetLimit) {
  const MAX_BACKFILL_ITERATIONS = 5;
  const categories = FEED_CATEGORY_VALUES;
  const targetPerCategory = Math.ceil(targetLimit / categories.length);

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
  }

  const firstPassCount = allArticles.length;

  // If we already have enough or more than requested, trim and return
  if (firstPassCount >= targetLimit) {
    return allArticles.slice(0, targetLimit);
  }

  // BACKFILL PASSES: Try to fill deficit from categories with available articles
  let currentCount = firstPassCount;
  let iteration = 0;
  const usedArticleIds = new Set(allArticles.map(a => a._id.toString()));

  while (currentCount < targetLimit && iteration < MAX_BACKFILL_ITERATIONS) {
    iteration++;
    let articlesAddedThisIteration = 0;

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
      }
    }

    // Fail-safe: If no articles were added this iteration, we've exhausted the database
    if (articlesAddedThisIteration === 0) {
      break;
    }
  }

  return allArticles;
}
