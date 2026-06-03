/**
 * backfill-is-used.js
 * Ensures every tonka_dispatch_newsletters and tonka_spark_posts document has
 * the is_used field, setting it to false where it is currently missing. Keeps
 * all documents the same shape after the used-toggle feature was added.
 *
 * Only documents that lack the field are touched; existing values are left
 * untouched. Safe to run repeatedly.
 *
 * Usage:
 *   node scripts/backfill-is-used.js            # live update
 *   node scripts/backfill-is-used.js --dry-run  # show counts only
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import TonkaDispatchNewsletter from '../src/models/tonkaDispatchNewsletters.model.js';
import TonkaSparkPosts from '../src/models/tonkaSparkPost.model.js';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

const MONGO_URI = process.env.MONGODB_TKISOCIAL_URI;
if (!MONGO_URI) {
  console.error('MONGODB_TKISOCIAL_URI not set in .env');
  process.exit(1);
}

// Documents where the field was never set.
const missingFilter = { is_used: { $exists: false } };

const targets = [
  { label: 'tonka_dispatch_newsletters', model: TonkaDispatchNewsletter },
  { label: 'tonka_spark_posts', model: TonkaSparkPosts },
];

await mongoose.connect(MONGO_URI);

try {
  console.log(
    `Mode: ${DRY_RUN ? 'DRY RUN (no update)' : 'LIVE (sets missing field to false)'}\n`
  );

  for (const { label, model } of targets) {
    const missingCount = await model.countDocuments(missingFilter);
    console.log(`${label} missing is_used: ${missingCount}`);

    if (DRY_RUN || missingCount === 0) {
      continue;
    }

    const result = await model.updateMany(missingFilter, {
      $set: { is_used: false },
    });

    console.log(
      `  → backfilled ${label}: matched ${result.matchedCount}, modified ${result.modifiedCount}`
    );
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. No records were updated.');
  } else {
    console.log('\nBackfill complete.');
  }
} catch (error) {
  console.error('\nBackfill failed:');
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
