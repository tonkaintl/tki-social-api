/**
 * investigate-latest-batch.js
 * Diagnoses why "Use Latest Batch" newsletter creation adds zero/one articles.
 *
 * Checks:
 *   1. What the most-recent batch is (by created_at) and how many rankings it has
 *   2. How many of those rankings are already claimed (used_in_newsletter_id != null)
 *   3. Whether any claims point at newsletters that no longer exist (orphans)
 *
 * Usage:
 *   node scripts/investigate-latest-batch.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import TonkaDispatchNewsletter from '../src/models/tonkaDispatchNewsletters.model.js';
import TonkaDispatchRanking from '../src/models/tonkaDispatchRankings.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_TKISOCIAL_URI;
if (!MONGO_URI) {
  console.error('MONGODB_TKISOCIAL_URI not set in .env');
  process.exit(1);
}

await mongoose.connect(MONGO_URI);

try {
  // ---- Overall newsletter / ranking counts ----
  const newsletterCount = await TonkaDispatchNewsletter.countDocuments();
  const rankingCount = await TonkaDispatchRanking.countDocuments();
  const claimedCount = await TonkaDispatchRanking.countDocuments({
    used_in_newsletter_id: { $ne: null },
  });

  console.log('=== Overall ===');
  console.log(`newsletters total      : ${newsletterCount}`);
  console.log(`rankings total         : ${rankingCount}`);
  console.log(`rankings claimed (used): ${claimedCount}`);
  console.log('');

  // ---- Most recent batches by created_at ----
  console.log('=== Batches (most recent first, by created_at) ===');
  const batchAgg = await TonkaDispatchRanking.aggregate([
    {
      $group: {
        _id: '$batch_id',
        available: {
          $sum: {
            $cond: [{ $eq: ['$used_in_newsletter_id', null] }, 1, 0],
          },
        },
        claimed: {
          $sum: {
            $cond: [{ $ne: ['$used_in_newsletter_id', null] }, 1, 0],
          },
        },
        first_created: { $min: '$created_at' },
        last_created: { $max: '$created_at' },
        total: { $sum: 1 },
      },
    },
    { $sort: { last_created: -1 } },
    { $limit: 8 },
  ]);

  for (const b of batchAgg) {
    console.log(
      `batch_id=${b._id} | total=${b.total} available=${b.available} claimed=${b.claimed} | created=${b.last_created?.toISOString?.() ?? b.last_created}`
    );
  }
  console.log('');

  // ---- Drill into the single most-recent batch ----
  const latest = batchAgg[0];
  if (latest) {
    console.log(`=== Latest batch detail: ${latest._id} ===`);
    const rows = await TonkaDispatchRanking.find({ batch_id: latest._id })
      .sort({ rank: 1 })
      .select('rank title used_in_newsletter_id created_at');

    for (const r of rows) {
      console.log(
        `  rank=${r.rank} used_in=${r.used_in_newsletter_id ?? 'NULL'} | ${r.title?.slice(0, 60)}`
      );
    }
    console.log('');
  }

  // ---- Orphaned claims: claimed by a newsletter that no longer exists ----
  console.log(
    '=== Orphaned claims (used_in_newsletter_id -> missing newsletter) ==='
  );
  const claimed = await TonkaDispatchRanking.find({
    used_in_newsletter_id: { $ne: null },
  }).select('used_in_newsletter_id batch_id rank title');

  const existingIds = new Set(
    (await TonkaDispatchNewsletter.find().select('_id')).map(n =>
      n._id.toString()
    )
  );

  const orphans = claimed.filter(
    r => !existingIds.has(r.used_in_newsletter_id.toString())
  );

  console.log(`claimed rankings        : ${claimed.length}`);
  console.log(`orphaned claims         : ${orphans.length}`);
  if (orphans.length > 0) {
    const orphanNlIds = [
      ...new Set(orphans.map(o => o.used_in_newsletter_id.toString())),
    ];
    console.log(`orphan newsletter ids   : ${orphanNlIds.join(', ')}`);
    for (const o of orphans.slice(0, 20)) {
      console.log(
        `  batch=${o.batch_id} rank=${o.rank} -> ${o.used_in_newsletter_id} | ${o.title?.slice(0, 50)}`
      );
    }
  }
} catch (error) {
  console.error('\nInvestigation failed:');
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
