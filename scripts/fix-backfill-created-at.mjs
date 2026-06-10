// ----------------------------------------------------------------------------
// One-off: re-date existing `backfill-YYYY-MM-DD` ranking batches so their
// created_at reflects the day they REPRESENT (encoded in batch_id), not the day
// the backfill script happened to run. The Daily Rankings UI groups/sorts by
// created_at, so without this all backfilled days pile onto the run date.
//
// We stamp created_at = <date>T12:00:00Z  (= 7:00 AM America/Chicago, CDT),
// matching how the real 7am cron batches display.
//
// No re-scoring, no token cost — pure created_at update.
//
// Usage (PowerShell):
//   node scripts/fix-backfill-created-at.mjs            # DRY RUN (shows changes)
//   node scripts/fix-backfill-created-at.mjs --go       # apply
// ----------------------------------------------------------------------------

import 'dotenv/config';
import mongoose from 'mongoose';

const GO = process.argv.includes('--go');

// Node can't resolve SRV on this machine — rewrite to direct multi-host.
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

await mongoose.connect(directUri(process.env.MONGODB_TKISOCIAL_URI));
const TonkaDispatchRanking = (
  await import('../src/models/tonkaDispatchRankings.model.js')
).default;

const BATCH_RE = /^backfill-(\d{4}-\d{2}-\d{2})$/;

const batchIds = (await TonkaDispatchRanking.distinct('batch_id')).filter(b =>
  BATCH_RE.test(b)
);

console.log(`mode: ${GO ? 'LIVE (apply)' : 'DRY RUN (no writes)'}`);
console.log(`backfill batches found: ${batchIds.length}\n`);

let totalDocs = 0;
for (const batchId of batchIds.sort()) {
  const date = batchId.match(BATCH_RE)[1];
  const target = new Date(`${date}T12:00:00Z`); // 7:00 AM America/Chicago (CDT)

  const docs = await TonkaDispatchRanking.find({ batch_id: batchId }).select(
    'created_at'
  );
  const wrong = docs.filter(
    d => d.created_at?.toISOString() !== target.toISOString()
  ).length;
  const sampleBefore = docs[0]?.created_at?.toISOString() ?? 'n/a';

  console.log(
    `  ${batchId}  docs=${docs.length} needFix=${wrong}  ${sampleBefore} -> ${target.toISOString()}`
  );
  totalDocs += docs.length;

  if (GO && wrong > 0) {
    await TonkaDispatchRanking.updateMany(
      { batch_id: batchId },
      { $set: { created_at: target } }
    );
  }
}

console.log(
  `\n${GO ? 'Updated' : 'Would update'} created_at across ${batchIds.length} batches / ${totalDocs} docs.`
);
if (!GO) console.log('Re-run with --go to apply.');

await mongoose.disconnect();
process.exit(0);
