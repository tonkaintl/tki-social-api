/**
 * resend-dispatch-digests.js
 * Re-sends the most recent N dispatch ranking batches as individual digest
 * emails to TONKA_DISPATCH_RECIPIENTS (one email per batch). Read-only — does
 * not touch the DB. Reuses the live daily-digest email template.
 *
 * Usage:
 *   node scripts/resend-dispatch-digests.js            # most recent 3
 *   node scripts/resend-dispatch-digests.js --count=5
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGO_URI = process.env.MONGODB_TKISOCIAL_URI;
if (!MONGO_URI) {
  console.error('MONGODB_TKISOCIAL_URI not set in .env');
  process.exit(1);
}

const countArg = process.argv.find(a => a.startsWith('--count='));
const count = countArg ? Number(countArg.split('=')[1]) : 3;

await mongoose.connect(MONGO_URI);
console.log(`Connected. Resending ${count} most recent digest(s)...\n`);

const { resendRecentDigests } = await import(
  '../src/services/dispatchRanking.service.js'
);

const result = await resendRecentDigests({ count });

console.log('\nDone.');
console.log(`  sent: ${result.sent}/${result.batches.length}`);
for (const b of result.batches) {
  console.log(
    `   - ${b.batch_id}: ${b.sent ? `sent (${b.articles} articles)` : `FAILED — ${b.error}`}`
  );
}

await mongoose.disconnect();
