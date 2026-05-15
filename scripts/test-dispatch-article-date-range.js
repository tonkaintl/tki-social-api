/**
 * test-dispatch-article-date-range.js
 * Prints the date window of dispatch articles (or rankings) currently in Mongo.
 *
 * Usage:
 *   node scripts/test-dispatch-article-date-range.js
 *   node scripts/test-dispatch-article-date-range.js --rankings
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { CANDIDATE_MAX_AGE_DAYS } from '../src/constants/dispatchRanking.js';

dotenv.config();

const CHECK_RANKINGS = process.argv.includes('--rankings');

const MONGO_URI = process.env.MONGODB_TKISOCIAL_URI;
if (!MONGO_URI) {
  console.error('MONGODB_TKISOCIAL_URI not set in .env');
  process.exit(1);
}

function fmtMs(ms) {
  if (!Number.isFinite(ms)) return 'n/a';
  return `${new Date(ms).toISOString()} (${ms})`;
}

await mongoose.connect(MONGO_URI);
console.log('Connected to DB\n');

try {
  const cutoffMs = Date.now() - CANDIDATE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  if (CHECK_RANKINGS) {
    const { default: TonkaDispatchRanking } = await import(
      '../src/models/tonkaDispatchRankings.model.js'
    );

    const stats = await TonkaDispatchRanking.aggregate([
      {
        $facet: {
          dated: [
            { $match: { pub_date_ms: { $type: 'number' } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                maxMs: { $max: '$pub_date_ms' },
                minMs: { $min: '$pub_date_ms' },
              },
            },
          ],
          missing: [
            {
              $match: {
                $or: [
                  { pub_date_ms: { $exists: false } },
                  { pub_date_ms: null },
                ],
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const dated = stats?.[0]?.dated?.[0] || {
      count: 0,
      maxMs: null,
      minMs: null,
    };
    const missing = stats?.[0]?.missing?.[0]?.count || 0;

    const olderThanCutoff = await TonkaDispatchRanking.countDocuments({
      pub_date_ms: { $lt: cutoffMs, $type: 'number' },
    });
    const withinCutoff = await TonkaDispatchRanking.countDocuments({
      pub_date_ms: { $gte: cutoffMs, $type: 'number' },
    });

    const oldest = await TonkaDispatchRanking.find({
      pub_date_ms: { $type: 'number' },
    })
      .sort({ pub_date_ms: 1 })
      .limit(3)
      .select({ category: 1, link: 1, pub_date_ms: 1, title: 1 })
      .lean();

    const newest = await TonkaDispatchRanking.find({
      pub_date_ms: { $type: 'number' },
    })
      .sort({ pub_date_ms: -1 })
      .limit(3)
      .select({ category: 1, link: 1, pub_date_ms: 1, title: 1 })
      .lean();

    console.log('Collection: tonka_dispatch_rankings\n');
    console.log(`Dated docs           : ${dated.count}`);
    console.log(`Missing pub_date_ms  : ${missing}`);
    console.log(`Oldest pub_date_ms   : ${fmtMs(dated.minMs)}`);
    console.log(`Newest pub_date_ms   : ${fmtMs(dated.maxMs)}`);
    console.log(`Cutoff (${CANDIDATE_MAX_AGE_DAYS}d)   : ${fmtMs(cutoffMs)}`);
    console.log(`Within cutoff        : ${withinCutoff}`);
    console.log(`Older than cutoff    : ${olderThanCutoff}`);

    console.log('\nOldest 3 docs:');
    oldest.forEach((d, i) => {
      console.log(
        `${String(i + 1).padStart(2)}. ${fmtMs(d.pub_date_ms)} | ${d.category || 'uncategorized'} | ${d.title || '(no title)'}`
      );
    });

    console.log('\nNewest 3 docs:');
    newest.forEach((d, i) => {
      console.log(
        `${String(i + 1).padStart(2)}. ${fmtMs(d.pub_date_ms)} | ${d.category || 'uncategorized'} | ${d.title || '(no title)'}`
      );
    });
  } else {
    const { default: DispatchArticle } = await import(
      '../src/models/dispatchArticle.model.js'
    );

    const stats = await DispatchArticle.aggregate([
      {
        $facet: {
          dated: [
            { $match: { published_at_ms: { $type: 'number' } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                maxMs: { $max: '$published_at_ms' },
                minMs: { $min: '$published_at_ms' },
              },
            },
          ],
          missing: [
            {
              $match: {
                $or: [
                  { published_at_ms: { $exists: false } },
                  { published_at_ms: null },
                ],
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const dated = stats?.[0]?.dated?.[0] || {
      count: 0,
      maxMs: null,
      minMs: null,
    };
    const missing = stats?.[0]?.missing?.[0]?.count || 0;

    const olderThanCutoff = await DispatchArticle.countDocuments({
      published_at_ms: { $lt: cutoffMs, $type: 'number' },
    });
    const withinCutoff = await DispatchArticle.countDocuments({
      published_at_ms: { $gte: cutoffMs, $type: 'number' },
    });

    const oldest = await DispatchArticle.find({
      published_at_ms: { $type: 'number' },
    })
      .sort({ published_at_ms: 1 })
      .limit(3)
      .select({ category: 1, link: 1, published_at_ms: 1, title: 1 })
      .lean();

    const newest = await DispatchArticle.find({
      published_at_ms: { $type: 'number' },
    })
      .sort({ published_at_ms: -1 })
      .limit(3)
      .select({ category: 1, link: 1, published_at_ms: 1, title: 1 })
      .lean();

    console.log('Collection: dispatch_articles\n');
    console.log(`Dated docs              : ${dated.count}`);
    console.log(`Missing published_at_ms : ${missing}`);
    console.log(`Oldest published_at_ms  : ${fmtMs(dated.minMs)}`);
    console.log(`Newest published_at_ms  : ${fmtMs(dated.maxMs)}`);
    console.log(
      `Cutoff (${CANDIDATE_MAX_AGE_DAYS}d)      : ${fmtMs(cutoffMs)}`
    );
    console.log(`Within cutoff           : ${withinCutoff}`);
    console.log(`Older than cutoff       : ${olderThanCutoff}`);

    console.log('\nOldest 3 docs:');
    oldest.forEach((d, i) => {
      console.log(
        `${String(i + 1).padStart(2)}. ${fmtMs(d.published_at_ms)} | ${d.category || 'uncategorized'} | ${d.title || '(no title)'}`
      );
    });

    console.log('\nNewest 3 docs:');
    newest.forEach((d, i) => {
      console.log(
        `${String(i + 1).padStart(2)}. ${fmtMs(d.published_at_ms)} | ${d.category || 'uncategorized'} | ${d.title || '(no title)'}`
      );
    });
  }
} catch (err) {
  console.error('\nDate range check failed:');
  console.error(err);
} finally {
  await mongoose.disconnect();
}
