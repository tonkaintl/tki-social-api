/**
 * analyze-dispatch-db.js
 * Quick snapshot of dispatch_articles and tonka_dispatch_rankings
 * Usage: node scripts/analyze-dispatch-db.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGO_URI = process.env.MONGODB_TKISOCIAL_URI;
if (!MONGO_URI) {
  console.error('MONGODB_TKISOCIAL_URI not set in .env');
  process.exit(1);
}

// ── Pipeline thresholds (must match src/constants/dispatchRanking.js) ────────
const CANDIDATE_SCORE_MIN = 70;
const CANDIDATE_MAX_AGE_DAYS = 14;

// ── Minimal schemas (just enough to query) ──────────────────────────────────

const articleSchema = new mongoose.Schema(
  {},
  { collection: 'dispatch_articles', strict: false }
);
const rankingSchema = new mongoose.Schema(
  {},
  { collection: 'tonka_dispatch_rankings', strict: false }
);

const Article = mongoose.model('Article', articleSchema);
const Ranking = mongoose.model('Ranking', rankingSchema);

// ── Helpers ──────────────────────────────────────────────────────────────────

const pct = (n, total) => (total ? `${((n / total) * 100).toFixed(1)}%` : '0%');

// ── Main ─────────────────────────────────────────────────────────────────────

await mongoose.connect(MONGO_URI);
console.log('\n✓ Connected\n');

// ── ARTICLES ─────────────────────────────────────────────────────────────────

const totalArticles = await Article.countDocuments();
const unscoredCount = await Article.countDocuments({ 'relevance.score': -1 });
const scored = totalArticles - unscoredCount;

// Score distribution (scored only)
const scoreDistRaw = await Article.aggregate([
  { $match: { 'relevance.score': { $gt: -1 } } },
  {
    $bucket: {
      boundaries: [0, 60, 80, 95, 101],
      default: 'other',
      groupBy: '$relevance.score',
      output: { count: { $sum: 1 } },
    },
  },
]);

// Category distribution
const catDist = await Article.aggregate([
  { $group: { _id: '$category', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 20 },
]);

// Age distribution (articles in the last 14 days vs older)
const now = Date.now();
const cutoff = now - CANDIDATE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const recent = await Article.countDocuments({
  published_at_ms: { $gte: cutoff },
});

// High-score not yet used — use actual pipeline thresholds
const usedIds = await Ranking.distinct('dispatch_article_id');
const validUsedIds = usedIds.filter(id => id !== null);

const highScoreTotal = await Article.countDocuments({
  'relevance.score': { $gte: CANDIDATE_SCORE_MIN },
});
const highScoreUnused = await Article.countDocuments({
  _id: { $nin: validUsedIds },
  'relevance.score': { $gte: CANDIDATE_SCORE_MIN },
});
const highScoreRecentUnused = await Article.countDocuments({
  _id: { $nin: validUsedIds },
  published_at_ms: { $gte: cutoff },
  'relevance.score': { $gte: CANDIDATE_SCORE_MIN },
});

// Candidate pool by category — what the pipeline would actually pull
const candidateByCat = await Article.aggregate([
  {
    $match: {
      _id: { $nin: validUsedIds },
      published_at_ms: { $gte: cutoff },
      'relevance.score': { $gte: CANDIDATE_SCORE_MIN },
    },
  },
  {
    $group: {
      _id: '$category',
      avgScore: { $avg: '$relevance.score' },
      count: { $sum: 1 },
    },
  },
  { $sort: { count: -1 } },
]);

// ── RANKINGS ─────────────────────────────────────────────────────────────────

const totalRankings = await Ranking.countDocuments();
const distinctBatches = await Ranking.distinct('batch_id');

// Most recent 5 batches with date + count
const recentBatches = await Ranking.aggregate([
  {
    $group: {
      _id: '$batch_id',
      count: { $sum: 1 },
      created_at: { $max: '$created_at' },
    },
  },
  { $sort: { created_at: -1 } },
  { $limit: 5 },
]);

// Category breakdown in rankings
const rankingCatDist = await Ranking.aggregate([
  { $group: { _id: '$category', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 15 },
]);

// ── PRINT REPORT ─────────────────────────────────────────────────────────────

console.log('═'.repeat(60));
console.log(' DISPATCH ARTICLES');
console.log('═'.repeat(60));
console.log(`  Total articles       : ${totalArticles.toLocaleString()}`);
console.log(
  `  Scored               : ${scored.toLocaleString()} (${pct(scored, totalArticles)})`
);
console.log(
  `  Unscored (-1)        : ${unscoredCount.toLocaleString()} (${pct(unscoredCount, totalArticles)})`
);
console.log(
  `  Published last 14d   : ${recent.toLocaleString()} (${pct(recent, totalArticles)})`
);
console.log('');
console.log('  Score buckets (scored articles):');
const bucketLabels = { 0: '<60', 60: '60–79', 80: '80–94', 95: '95–100' };
for (const b of scoreDistRaw) {
  const label = bucketLabels[b._id] ?? b._id;
  console.log(`    ${label.padEnd(10)}: ${b.count.toLocaleString()}`);
}
console.log('');
console.log(
  `  Pipeline threshold   : score ≥ ${CANDIDATE_SCORE_MIN}, last ${CANDIDATE_MAX_AGE_DAYS} days, not yet used`
);
console.log(
  `  score ≥ ${CANDIDATE_SCORE_MIN} (all time) → total: ${highScoreTotal.toLocaleString()}  unused: ${highScoreUnused.toLocaleString()}`
);
console.log(
  `  score ≥ ${CANDIDATE_SCORE_MIN} (recent, unused) → ${highScoreRecentUnused.toLocaleString()}  ← actual candidate pool size`
);
console.log('');
console.log(
  '  Candidate pool by category (what the pipeline would use today):'
);
const totalCandidates = candidateByCat.reduce((s, c) => s + c.count, 0);
for (const c of candidateByCat) {
  const label = (c._id ?? 'uncategorized').padEnd(30);
  const avg = c.avgScore.toFixed(1);
  console.log(
    `    ${label}: ${String(c.count).padStart(4)}  (${pct(c.count, totalCandidates)})  avg score ${avg}`
  );
}
console.log(`    ${'TOTAL'.padEnd(30)}: ${totalCandidates}`);
console.log('');
console.log('  Top categories (all articles):');
for (const c of catDist) {
  const label = (c._id ?? 'uncategorized').padEnd(30);
  console.log(
    `    ${label}: ${c.count.toLocaleString()} (${pct(c.count, totalArticles)})`
  );
}

console.log('');
console.log('═'.repeat(60));
console.log(' RANKINGS');
console.log('═'.repeat(60));
console.log(`  Total ranking records: ${totalRankings.toLocaleString()}`);
console.log(
  `  Distinct batches     : ${distinctBatches.length.toLocaleString()}`
);
console.log(`  Distinct used IDs    : ${validUsedIds.length.toLocaleString()}`);
console.log('');
console.log('  Last 5 batches:');
for (const b of recentBatches) {
  const date = b.created_at
    ? new Date(b.created_at).toLocaleString('en-US', {
        timeZone: 'America/Chicago',
      })
    : 'unknown';
  console.log(`    ${b._id}  ${date}  (${b.count} articles)`);
}
console.log('');
console.log('  Category breakdown in rankings:');
for (const c of rankingCatDist) {
  const label = (c._id ?? 'uncategorized').padEnd(30);
  console.log(
    `    ${label}: ${c.count.toLocaleString()} (${pct(c.count, totalRankings)})`
  );
}

console.log('');
console.log('═'.repeat(60));
await mongoose.disconnect();
