/**
 * cleanup-dispatch-retention.js
 * Deletes old records from dispatch_articles and tonka_dispatch_rankings.
 *
 * Usage:
 *   node scripts/cleanup-dispatch-retention.js            # live delete
 *   node scripts/cleanup-dispatch-retention.js --dry-run  # show counts only
 *   node scripts/cleanup-dispatch-retention.js --days=28
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import DispatchArticle from '../src/models/dispatchArticle.model.js';
import TonkaDispatchRanking from '../src/models/tonkaDispatchRankings.model.js';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');
const daysArg = process.argv.find(arg => arg.startsWith('--days='));
const retentionDays = Number(
  daysArg?.split('=')[1] || process.env.DISPATCH_BACKLOG_DAYS || 28
);

if (!Number.isFinite(retentionDays) || retentionDays < 1) {
  console.error('Invalid --days value. Example: --days=28');
  process.exit(1);
}

const MONGO_URI = process.env.MONGODB_TKISOCIAL_URI;
if (!MONGO_URI) {
  console.error('MONGODB_TKISOCIAL_URI not set in .env');
  process.exit(1);
}

const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
const cutoffDate = new Date(cutoffMs);

await mongoose.connect(MONGO_URI);

try {
  console.log(
    `Mode: ${DRY_RUN ? 'DRY RUN (no delete)' : 'LIVE (deletes old records)'}`
  );
  console.log(`Retention days: ${retentionDays}`);
  console.log(`Cutoff: ${cutoffDate.toISOString()} (${cutoffMs})\n`);

  const oldArticleFilter = {
    published_at_ms: { $lt: cutoffMs },
  };

  // Rankings primarily use pub_date_ms copied from source article.
  // If pub_date_ms is missing, fall back to created_at age.
  const oldRankingFilter = {
    $or: [
      { pub_date_ms: { $lt: cutoffMs } },
      {
        $and: [
          {
            $or: [{ pub_date_ms: { $exists: false } }, { pub_date_ms: null }],
          },
          { created_at: { $lt: cutoffDate } },
        ],
      },
    ],
  };

  const oldArticlesCount =
    await DispatchArticle.countDocuments(oldArticleFilter);
  const oldRankingsCount =
    await TonkaDispatchRanking.countDocuments(oldRankingFilter);

  console.log(`dispatch_articles to delete      : ${oldArticlesCount}`);
  console.log(`tonka_dispatch_rankings to delete: ${oldRankingsCount}`);

  if (DRY_RUN) {
    console.log('\nDry run complete. No records were deleted.');
  } else {
    const articleResult = await DispatchArticle.deleteMany(oldArticleFilter);
    const rankingResult =
      await TonkaDispatchRanking.deleteMany(oldRankingFilter);

    console.log('\nDeleted records:');
    console.log(`dispatch_articles      : ${articleResult.deletedCount}`);
    console.log(`tonka_dispatch_rankings: ${rankingResult.deletedCount}`);
  }
} catch (error) {
  console.error('\nCleanup failed:');
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
