// ----------------------------------------------------------------------------
// Dispatch Stats Service
//
// Read-only snapshots of the dispatch_articles inventory, emitted to the
// logger so every run — cron or manual — leaves a record on the server.
// ----------------------------------------------------------------------------

import DispatchArticle from '../models/dispatchArticle.model.js';
import { logger } from '../utils/logger.js';

/**
 * Group dispatch_articles by category and log the counts. Intended to run
 * AFTER retention cleanup and BEFORE the day's scoring/assignment, so the log
 * reflects the exact article inventory the ranking run will draw from.
 *
 * @param {object} [opts]
 * @param {string} [opts.label='manual']  Free-text tag identifying the caller
 *   in the logs (e.g. 'cron-post-cleanup', 'manual').
 * @param {number} [opts.threshold=80]    Score at/above which an article is
 *   counted as "high score" per category.
 * @returns {Promise<{categories: Array, threshold: number, total: number,
 *   totalHighScore: number, totalScored: number}>}
 */
export async function logCategorySnapshot({
  label = 'manual',
  threshold = 80,
} = {}) {
  const rows = await DispatchArticle.aggregate([
    {
      $group: {
        _id: '$category',
        avgScoreSum: {
          $sum: {
            $cond: [{ $gt: ['$relevance.score', -1] }, '$relevance.score', 0],
          },
        },
        highScore: {
          $sum: { $cond: [{ $gte: ['$relevance.score', threshold] }, 1, 0] },
        },
        scored: {
          $sum: { $cond: [{ $gt: ['$relevance.score', -1] }, 1, 0] },
        },
        total: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

  const categories = rows.map(r => ({
    avgScore:
      r.scored > 0 ? Math.round((r.avgScoreSum / r.scored) * 10) / 10 : null,
    category: r._id || 'uncategorized',
    highScore: r.highScore,
    scored: r.scored,
    total: r.total,
  }));

  const total = categories.reduce((s, c) => s + c.total, 0);
  const totalScored = categories.reduce((s, c) => s + c.scored, 0);
  const totalHighScore = categories.reduce((s, c) => s + c.highScore, 0);

  logger.info('[DispatchStats] Category snapshot', {
    categories,
    label,
    threshold,
    total,
    total_high_score: totalHighScore,
    total_scored: totalScored,
  });

  return { categories, threshold, total, totalHighScore, totalScored };
}
