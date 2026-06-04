import mongoose from 'mongoose';

import {
  ARTICLES_ERROR_CODE,
  MANUAL_PROMOTE,
} from '../../../constants/tonkaDispatch.js';
import DispatchArticle from '../../../models/dispatchArticle.model.js';
import TonkaDispatchRanking from '../../../models/tonkaDispatchRankings.model.js';
import { logger } from '../../../utils/logger.js';

// Group hand-added rankings by the day they were promoted, keeping them visually
// distinct from the daily pipeline's UUID batches in the rankings list.
function manualBatchId() {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${MANUAL_PROMOTE.BATCH_PREFIX}-${day}`;
}

/**
 * Manually promote a dispatch_article into a tonka_dispatch_rankings document,
 * making it "ranked" (and therefore enrichable + usable in newsletters).
 *
 * Mirrors the field mapping of the daily pipeline's saveRankings so a manual
 * ranking is indistinguishable downstream, differing only in provenance
 * (match_method/feed_match_reason) and a "manual-<date>" batch_id. rank is left
 * null — there is no algorithmic rank for a one-off; state keys off the ranking
 * existing, not its rank value.
 *
 * POST /api/dispatch/articles/:id/promote
 */
export async function promoteArticle(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn('Invalid article ID format for promote', {
        id,
        requestId: req.id,
      });

      return res.status(400).json({
        code: ARTICLES_ERROR_CODE.INVALID_ARTICLE_ID,
        message: 'Invalid article ID format',
        requestId: req.id,
      });
    }

    const article = await DispatchArticle.findById(id).populate('rss_link_id');

    if (!article) {
      logger.warn('Article not found for promote', { id, requestId: req.id });

      return res.status(404).json({
        code: ARTICLES_ERROR_CODE.ARTICLE_NOT_FOUND,
        message: 'Article not found',
        requestId: req.id,
      });
    }

    // Dedup guard: an article maps to at most one ranking. If one already
    // exists, return it rather than creating a duplicate. (Concurrency here is
    // negligible — this is an operator-triggered, one-at-a-time action.)
    const existing = await TonkaDispatchRanking.findOne({
      dispatch_article_id: article._id,
    });

    if (existing) {
      logger.info('Article already promoted to a ranking', {
        id,
        ranking_id: existing._id,
        requestId: req.id,
      });

      return res.status(409).json({
        code: ARTICLES_ERROR_CODE.ALREADY_RANKED,
        message: 'This article is already promoted to a ranking',
        ranking: existing,
        requestId: req.id,
      });
    }

    const feed = article.rss_link_id || {};

    const ranking = await TonkaDispatchRanking.create({
      article_host: article.article_host || null,
      article_root_domain: article.article_root_domain || null,
      batch_id: manualBatchId(),
      canonical_id: article.link || null,
      category: article.category || null,
      creator: article.author || null,
      dispatch_article_id: article._id,
      feed_match_reason: MANUAL_PROMOTE.FEED_MATCH_REASON,
      feed_match_status: MANUAL_PROMOTE.FEED_MATCH_STATUS,
      link: article.link || null,
      match_method: MANUAL_PROMOTE.MATCH_METHOD,
      pub_date_ms: article.published_at_ms || null,
      rank: null,
      snippet: (article.content_snippet || '').slice(0, 500),
      source_name: feed.name || null,
      title: article.title || null,
      tonka_dispatch_rss_links_id: feed._id?.toString() || null,
      used_in_newsletter_id: null,
    });

    logger.info('Article promoted to ranking', {
      batch_id: ranking.batch_id,
      id,
      ranking_id: ranking._id,
      requestId: req.id,
    });

    return res.status(201).json({
      ranking,
      requestId: req.id,
      status: 'success',
    });
  } catch (error) {
    logger.error('Failed to promote article', {
      error: error.message,
      id: req.params.id,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: ARTICLES_ERROR_CODE.PROMOTE_FAILED,
      message: 'Failed to promote article',
      requestId: req.id,
    });
  }
}
