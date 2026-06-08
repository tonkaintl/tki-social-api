/**
 * log-dispatch-snapshot.js
 * Logs a category-count snapshot of dispatch_articles — total, scored, and
 * count at/above a score threshold, per category. Run whenever you want a
 * record of the current article inventory by industry (the same snapshot the
 * cron writes after retention cleanup).
 *
 * Usage:
 *   node scripts/log-dispatch-snapshot.js
 *   node scripts/log-dispatch-snapshot.js --threshold=85
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGO_URI = process.env.MONGODB_TKISOCIAL_URI;
if (!MONGO_URI) {
  console.error('MONGODB_TKISOCIAL_URI not set in .env');
  process.exit(1);
}

const thresholdArg = process.argv.find(a => a.startsWith('--threshold='));
const threshold = thresholdArg ? Number(thresholdArg.split('=')[1]) : 80;

await mongoose.connect(MONGO_URI);
console.log('Connected\n');

const { logCategorySnapshot } = await import(
  '../src/services/dispatchStats.service.js'
);

const snap = await logCategorySnapshot({ label: 'manual', threshold });

// Pretty table for the terminal (the structured line is already in the logs).
const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);

console.log('');
console.log('═'.repeat(72));
console.log(` DISPATCH ARTICLES BY CATEGORY`);
console.log('═'.repeat(72));
console.log(
  `${pad('category', 28)} ${lpad('total', 8)} ${lpad('scored', 8)} ${lpad(`>=${threshold}`, 8)} ${lpad('avg', 8)}`
);
console.log('─'.repeat(72));
for (const c of snap.categories) {
  console.log(
    `${pad(c.category, 28)} ${lpad(c.total, 8)} ${lpad(c.scored, 8)} ${lpad(c.highScore, 8)} ${lpad(c.avgScore ?? '-', 8)}`
  );
}
console.log('─'.repeat(72));
console.log(
  `${pad('TOTAL', 28)} ${lpad(snap.total, 8)} ${lpad(snap.totalScored, 8)} ${lpad(snap.totalHighScore, 8)}`
);
console.log('═'.repeat(72) + '\n');

await mongoose.disconnect();
