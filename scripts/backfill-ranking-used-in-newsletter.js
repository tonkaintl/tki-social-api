/**
 * backfill-ranking-used-in-newsletter.js
 * Ensures every tonka_dispatch_rankings document has the used_in_newsletter_id
 * field, setting it to null where it is currently missing. Keeps all rankings
 * the same shape after the single-use feature was added.
 *
 * Only documents that lack the field are touched; existing claims are left
 * untouched.
 *
 * Usage:
 *   node scripts/backfill-ranking-used-in-newsletter.js            # live update
 *   node scripts/backfill-ranking-used-in-newsletter.js --dry-run  # show count only
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import TonkaDispatchRanking from '../src/models/tonkaDispatchRankings.model.js';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

const MONGO_URI = process.env.MONGODB_TKISOCIAL_URI;
if (!MONGO_URI) {
  console.error('MONGODB_TKISOCIAL_URI not set in .env');
  process.exit(1);
}

// Documents where the field was never set.
const missingFilter = { used_in_newsletter_id: { $exists: false } };

await mongoose.connect(MONGO_URI);

try {
  console.log(
    `Mode: ${DRY_RUN ? 'DRY RUN (no update)' : 'LIVE (sets missing field to null)'}\n`
  );

  const missingCount = await TonkaDispatchRanking.countDocuments(missingFilter);

  console.log(
    `tonka_dispatch_rankings missing used_in_newsletter_id: ${missingCount}`
  );

  if (DRY_RUN) {
    console.log('\nDry run complete. No records were updated.');
  } else if (missingCount === 0) {
    console.log('\nNothing to backfill. All rankings already have the field.');
  } else {
    const result = await TonkaDispatchRanking.updateMany(missingFilter, {
      $set: { used_in_newsletter_id: null },
    });

    console.log('\nBackfill complete:');
    console.log(`matched : ${result.matchedCount}`);
    console.log(`modified: ${result.modifiedCount}`);
  }
} catch (error) {
  console.error('\nBackfill failed:');
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
