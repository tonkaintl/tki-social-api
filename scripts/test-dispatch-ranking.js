/**
 * test-dispatch-ranking.js
 * Runs the full daily ranking pipeline once against the real DB.
 *
 * Flags:
 *   (default)  Dry run — calls LLM, prints results, skips DB write + email.
 *   --live     Actually write to DB and send the email.
 *
 * Usage:
 *   node scripts/test-dispatch-ranking.js           # dry run
 *   node scripts/test-dispatch-ranking.js --live    # real write + email
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const LIVE = process.argv.includes('--live');
const DRY_RUN = !LIVE;

console.log(
  `\nMode: ${LIVE ? 'LIVE (will write DB + send email)' : 'DRY RUN (no DB write, no email)'}\n`
);

const MONGO_URI = process.env.MONGODB_TKISOCIAL_URI;
if (!MONGO_URI) {
  console.error('MONGODB_TKISOCIAL_URI not set in .env');
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log('Connected to DB\n');

const { runDailyRanking } = await import(
  '../src/services/dispatchRanking.service.js'
);

const start = Date.now();

try {
  const result = await runDailyRanking({ dryRun: DRY_RUN });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log(' RESULT');
  console.log('='.repeat(60));

  if (result.skipped) {
    console.log(`  Skipped: ${result.reason}`);
  } else if (result.dry_run) {
    console.log(`  batch_id (not saved): ${result.batch_id}`);
    console.log(`  rankings (${result.rankings.length}):`);
    for (const r of result.rankings) {
      const cat = (r.category || 'unknown').padEnd(25);
      console.log(
        `    ${String(r.rank).padStart(2)}. [${cat}] ${r.article_title || r.article_id}`
      );
      if (r.reason) console.log(`        reason: ${r.reason}`);
    }

    const dropped = result.dropped_by_cap || [];
    if (dropped.length > 0) {
      console.log(`\n  dropped by category cap (${dropped.length}):`);
      for (const d of dropped) {
        const cat = (d.category || 'unknown').padEnd(25);
        console.log(
          `    ${String(d.rank).padStart(2)}. [${cat}] ${d.title || d.article_id}`
        );
      }
    } else {
      console.log('\n  dropped by category cap: none');
    }
  } else {
    console.log(`  batch_id   : ${result.batch_id}`);
    console.log(`  saved      : ${result.saved_count}`);
    console.log(`  errors     : ${result.errors?.length ?? 0}`);
    if (result.errors?.length) {
      for (const e of result.errors) {
        console.log(`    - rank ${e.rank} (${e.article_id}): ${e.error}`);
      }
    }
  }

  console.log(`  elapsed    : ${elapsed}s`);
  console.log('='.repeat(60) + '\n');
} catch (err) {
  console.error('\nPipeline threw an error:');
  console.error(err);
}

await mongoose.disconnect();
