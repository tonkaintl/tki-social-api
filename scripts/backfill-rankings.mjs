// ----------------------------------------------------------------------------
// Backfill dispatch rankings for past days, walking dates FORWARD.
//
// Reuses the exact daily pipeline (runDailyRanking) with an `asOf` timestamp,
// so each backfilled day = "what the 7am cron would have produced that day":
//   select recent (published <= asOf) -> group by category -> score N newest
//   per category -> pick top 3 per category -> save.
//
// Walks oldest -> newest so EXCLUDE_USED carries each day's picks forward and
// days don't reuse the same articles. Skips weekends (no dispatch Sat/Sun).
//
// Usage (PowerShell — needs Windows DNS for the SRV->direct rewrite):
//   node scripts/backfill-rankings.mjs                 # prints the plan, does NOTHING
//   node scripts/backfill-rankings.mjs --go            # actually score + save (no email)
//   node scripts/backfill-rankings.mjs --go 2026-06-02 2026-06-03 2026-06-08
//   node scripts/backfill-rankings.mjs --go --email    # also send a digest per day
//
// Cost note: scoring runs even on the chosen days (that's the whole point); it
// is bounded to ~SCORE_PER_CATEGORY × categories per day and scores are cached,
// so re-running is cheap/idempotent.
// ----------------------------------------------------------------------------

import 'dotenv/config';
import mongoose from 'mongoose';

const args = process.argv.slice(2);
const GO = args.includes('--go');
const EMAIL = args.includes('--email');
const RESET = args.includes('--reset'); // delete all backfill-* batches first
const dates = args.filter(a => /^\d{4}-\d{2}-\d{2}$/.test(a));

// Default: the missed weekdays we want populated (the 6th/7th are a weekend).
const DEFAULT_DATES = [
  '2026-06-02',
  '2026-06-03',
  '2026-06-04',
  '2026-06-05',
  '2026-06-08',
];
const targetDates = dates.length > 0 ? dates : DEFAULT_DATES;

// As-of = end of that UTC day, capped at now (so "today" uses the current
// moment and never reaches into the future).
function asOfFor(dateStr) {
  return Math.min(Date.parse(`${dateStr}T23:59:59Z`), Date.now());
}

function isWeekend(dateStr) {
  const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay(); // 0 Sun .. 6 Sat
  return dow === 0 || dow === 6;
}

// --- direct (non-SRV) mongo connection: Node can't resolve SRV here ---
function directUri(uri) {
  if (!uri.startsWith('mongodb+srv://')) return uri;
  const m = uri.match(/^mongodb\+srv:\/\/([^@]+)@([^/]+)\/([^?]+)(\?.*)?$/);
  const [, creds, host, dbName] = m;
  const base = host.replace(/^[^.]+\./, '');
  const prefix = host.split('.')[0];
  const hosts = [0, 1, 2]
    .map(i => `${prefix}-shard-00-0${i}.${base}:27017`)
    .join(',');
  return `mongodb://${creds}@${hosts}/${dbName}?ssl=true&replicaSet=atlas-uys7di-shard-0&authSource=admin&retryWrites=true&w=majority`;
}

const plan = targetDates.map(d => ({
  date: d,
  weekend: isWeekend(d),
  asOf: new Date(asOfFor(d)).toISOString(),
}));

console.log('Backfill plan (forward order):');
for (const p of plan) {
  console.log(
    `  ${p.date}  asOf=${p.asOf}${p.weekend ? '  [WEEKEND — skipped]' : ''}`
  );
}
console.log(
  `\nmode: ${GO ? 'LIVE (score + save)' : 'PLAN ONLY (no changes)'}  email: ${EMAIL ? 'yes' : 'no'}`
);

if (!GO) {
  console.log('\nNothing executed. Re-run with --go to score + save.');
  process.exit(0);
}

await mongoose.connect(directUri(process.env.MONGODB_TKISOCIAL_URI));

if (RESET) {
  const TonkaDispatchRanking = (
    await import('../src/models/tonkaDispatchRankings.model.js')
  ).default;
  const res = await TonkaDispatchRanking.deleteMany({
    batch_id: { $regex: '^backfill-' },
  });
  console.log(`\n[reset] deleted ${res.deletedCount} prior backfill-* rankings`);
}

const { runDailyRanking } = await import(
  '../src/services/dispatchRanking.service.js'
);

const results = [];
for (const p of plan) {
  if (p.weekend) {
    results.push({ date: p.date, skipped: 'weekend' });
    continue;
  }
  console.log(`\n=== ${p.date} (asOf ${p.asOf}) ===`);
  const res = await runDailyRanking({
    asOf: asOfFor(p.date),
    batchId: `backfill-${p.date}`,
    sendEmail: EMAIL,
  });
  console.log(`  -> ${JSON.stringify(res.categories || res)}`);
  results.push({ date: p.date, ...res });
}

console.log('\n================ BACKFILL SUMMARY ================');
for (const r of results) {
  if (r.skipped) {
    console.log(`  ${r.date}: skipped (${r.skipped})`);
  } else {
    console.log(
      `  ${r.date}: batch=${r.batch_id || '-'} saved=${r.saved_count ?? 0}${r.reason ? ` (${r.reason})` : ''}`
    );
  }
}

await mongoose.disconnect();
process.exit(0);
