/**
 * backfill-is-live.js
 * Seeds the is_live flag on existing tonka_spark_posts documents after the
 * live-toggle feature was added.
 *
 * Policy (per product decision): every existing post is considered live
 * (is_live: true) EXCEPT one explicitly-excluded post, which is set to false.
 * Only documents missing the field are touched, so this is safe to re-run; the
 * excluded post is always pinned to false.
 *
 * Usage:
 *   node scripts/backfill-is-live.js            # live update
 *   node scripts/backfill-is-live.js --dry-run  # show counts only
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import TonkaSparkPosts from '../src/models/tonkaSparkPost.model.js';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

const MONGO_URI = process.env.MONGODB_TKISOCIAL_URI;
if (!MONGO_URI) {
  console.error('MONGODB_TKISOCIAL_URI not set in .env');
  process.exit(1);
}

// The single post that should NOT be marked live.
const EXCLUDED_ID = '6a280ee0810bfca561946e00';

await mongoose.connect(MONGO_URI);

try {
  console.log(
    `Mode: ${DRY_RUN ? 'DRY RUN (no update)' : 'LIVE (seeds is_live)'}\n`
  );

  const total = await TonkaSparkPosts.countDocuments();
  const missing = await TonkaSparkPosts.countDocuments({
    is_live: { $exists: false },
  });
  const excludedExists = await TonkaSparkPosts.countDocuments({
    _id: EXCLUDED_ID,
  });

  console.log(`tonka_spark_posts total          : ${total}`);
  console.log(`missing is_live                  : ${missing}`);
  console.log(
    `excluded post (${EXCLUDED_ID}) present: ${excludedExists ? 'yes' : 'NO — check the id'}`
  );

  if (DRY_RUN) {
    const willBeTrue = await TonkaSparkPosts.countDocuments({
      _id: { $ne: EXCLUDED_ID },
      is_live: { $exists: false },
    });
    console.log(`\nWould set is_live=true on : ${willBeTrue}`);
    console.log(
      `Would set is_live=false on: ${excludedExists ? 1 : 0} (excluded post)`
    );
    console.log('\nDry run complete. No records were updated.');
  } else {
    // Everyone missing the field, except the excluded post → true.
    const trueResult = await TonkaSparkPosts.updateMany(
      { _id: { $ne: EXCLUDED_ID }, is_live: { $exists: false } },
      { $set: { is_live: true } }
    );

    // The excluded post is always pinned to false (set regardless of state).
    const falseResult = await TonkaSparkPosts.updateOne(
      { _id: EXCLUDED_ID },
      { $set: { is_live: false } }
    );

    console.log(
      `\n→ is_live=true : matched ${trueResult.matchedCount}, modified ${trueResult.modifiedCount}`
    );
    console.log(
      `→ is_live=false (excluded): matched ${falseResult.matchedCount}, modified ${falseResult.modifiedCount}`
    );
    console.log('\nBackfill complete.');
  }
} catch (error) {
  console.error('\nBackfill failed:');
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
