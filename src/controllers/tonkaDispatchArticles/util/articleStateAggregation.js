// ----------------------------------------------------------------------------
// Shared aggregation building blocks for the dispatch_articles "viewer".
//
// dispatch_articles is the spine. Each article's state is DERIVED from whether
// a tonka_dispatch_rankings document points back at it (via dispatch_article_id)
// and, if so, whether that ranking has been claimed by a newsletter:
//   unranked = no ranking references the article
//   ranked   = a ranking exists, not yet used in a newsletter
//   used     = a ranking exists and is claimed (used_in_newsletter_id set)
//
// These helpers are reused by both the list and the category-count endpoints so
// the state logic stays in one place.
// ----------------------------------------------------------------------------

import {
  ARTICLE_STATE,
  ARTICLES_FIELDS,
  ARTICLES_SEARCH_FIELDS,
  RANKING_FIELDS,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchRanking from '../../../models/tonkaDispatchRankings.model.js';

// Resolve the real MongoDB collection name from the model so the $lookup can
// never drift from Mongoose's pluralization.
const RANKINGS_COLLECTION = TonkaDispatchRanking.collection.collectionName;

/**
 * Build the pre-lookup $match filter from already-parsed/validated query values.
 * Mirrors the original dispatch_articles list filters (category, publish-date
 * range, relevance-score range, multi-field search).
 *
 * @param {object} opts
 * @param {string} [opts.category]
 * @param {string} [opts.search]
 * @param {number} [opts.publishStartMs]
 * @param {number} [opts.publishEndMs]
 * @param {number} [opts.scoreMin]
 * @param {number} [opts.scoreMax]
 * @param {boolean} [opts.includeCategory=true] - category endpoints group BY
 *   category, so they exclude it from the match to show every chip.
 * @returns {object} MongoDB filter
 */
export function buildArticleBaseMatch({
  category,
  includeCategory = true,
  publishEndMs,
  publishStartMs,
  scoreMax,
  scoreMin,
  search,
} = {}) {
  const filter = {};

  if (includeCategory && category) {
    filter[ARTICLES_FIELDS.CATEGORY] = category;
  }

  if (publishStartMs !== undefined || publishEndMs !== undefined) {
    filter[ARTICLES_FIELDS.PUBLISHED_AT_MS] = {};
    if (publishStartMs !== undefined) {
      filter[ARTICLES_FIELDS.PUBLISHED_AT_MS].$gte = publishStartMs;
    }
    if (publishEndMs !== undefined) {
      filter[ARTICLES_FIELDS.PUBLISHED_AT_MS].$lte = publishEndMs;
    }
  }

  if (scoreMin !== undefined || scoreMax !== undefined) {
    filter[ARTICLES_FIELDS.RELEVANCE_SCORE] = {};
    if (scoreMin !== undefined) {
      filter[ARTICLES_FIELDS.RELEVANCE_SCORE].$gte = scoreMin;
    }
    if (scoreMax !== undefined) {
      filter[ARTICLES_FIELDS.RELEVANCE_SCORE].$lte = scoreMax;
    }
  }

  if (search && search.trim() !== '') {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = ARTICLES_SEARCH_FIELDS.map(field => ({
      [field]: searchRegex,
    }));
  }

  return filter;
}

/**
 * Pipeline stages that join rankings and derive `state` plus a few flattened
 * ranking fields the viewer surfaces (ranking_id, enrichment status, summary,
 * used_in_newsletter_id). Internal scratch fields are projected out at the end.
 *
 * @returns {Array<object>} aggregation stages
 */
export function articleStateStages() {
  return [
    {
      $lookup: {
        as: 'rankings',
        foreignField: RANKING_FIELDS.DISPATCH_ARTICLE_ID,
        from: RANKINGS_COLLECTION,
        localField: '_id',
      },
    },
    {
      $addFields: {
        _used_rankings: {
          $filter: {
            as: 'r',
            cond: {
              $ne: [{ $ifNull: ['$$r.used_in_newsletter_id', null] }, null],
            },
            input: '$rankings',
          },
        },
      },
    },
    {
      $addFields: {
        _chosen_ranking: {
          $ifNull: [{ $first: '$_used_rankings' }, { $first: '$rankings' }],
        },
        state: {
          $switch: {
            branches: [
              {
                case: { $eq: [{ $size: '$rankings' }, 0] },
                then: ARTICLE_STATE.UNRANKED,
              },
              {
                case: { $gt: [{ $size: '$_used_rankings' }, 0] },
                then: ARTICLE_STATE.USED,
              },
            ],
            default: ARTICLE_STATE.RANKED,
          },
        },
      },
    },
    {
      $addFields: {
        ai_enrichment_status: '$_chosen_ranking.ai_enrichment_status',
        ai_summary: '$_chosen_ranking.ai_summary',
        // Enrichment writes the article image + OG metadata onto the ranking,
        // not the raw dispatch_article — surface them so they survive a reload.
        og_description: '$_chosen_ranking.og_description',
        og_image_url: '$_chosen_ranking.og_image_url',
        og_title: '$_chosen_ranking.og_title',
        ranking_id: '$_chosen_ranking._id',
        used_in_newsletter_id: {
          $ifNull: ['$_chosen_ranking.used_in_newsletter_id', null],
        },
      },
    },
    {
      $project: {
        _chosen_ranking: 0,
        _used_rankings: 0,
        rankings: 0,
      },
    },
  ];
}
