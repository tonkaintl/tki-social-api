// read-only data check using the SRV->direct rewrite
import 'dotenv/config';
import mongoose from 'mongoose';

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
const DispatchArticle = (await import('../src/models/dispatchArticle.model.js'))
  .default;
const TonkaDispatchRanking = (
  await import('../src/models/tonkaDispatchRankings.model.js')
).default;

const DAY = 86400000;
const now = Date.now();

const artTotal = await DispatchArticle.countDocuments();
const rankTotal = await TonkaDispatchRanking.countDocuments();
console.log(`dispatch_articles total : ${artTotal}`);
console.log(`rankings total          : ${rankTotal}\n`);

// article publish-date spread
const artBuckets = await DispatchArticle.aggregate([
  { $match: { published_at_ms: { $ne: null } } },
  {
    $group: {
      _id: {
        $dateToString: {
          date: { $toDate: '$published_at_ms' },
          format: '%Y-%m-%d',
        },
      },
      n: { $sum: 1 },
    },
  },
  { $sort: { _id: -1 } },
  { $limit: 14 },
]);
console.log('articles by publish day (last 14 present):');
for (const b of artBuckets) console.log(`  ${b._id}  ${b.n}`);

// rankings by created_at day + the pub_date span within each
const rankBuckets = await TonkaDispatchRanking.aggregate([
  {
    $group: {
      _id: { $dateToString: { date: '$created_at', format: '%Y-%m-%d' } },
      batches: { $addToSet: '$batch_id' },
      maxPub: { $max: '$pub_date_ms' },
      minPub: { $min: '$pub_date_ms' },
      n: { $sum: 1 },
    },
  },
  { $sort: { _id: -1 } },
  { $limit: 20 },
]);
console.log('\nrankings by created_at day:');
for (const b of rankBuckets) {
  const span = b.minPub
    ? `${new Date(b.minPub).toISOString().slice(0, 10)}..${new Date(b.maxPub).toISOString().slice(0, 10)}`
    : 'n/a';
  console.log(
    `  ${b._id}  n=${b.n}  pubspan=${span}  batches=${b.batches.join(',')}`
  );
}

// the actual gap: rankings whose underlying article is older than 14d (would be deleted)
const cutoff14 = now - 14 * DAY;
const oldPubRankings = await TonkaDispatchRanking.countDocuments({
  pub_date_ms: { $lt: cutoff14 },
});
console.log(
  `\nrankings with pub_date older than 14d (retention would delete): ${oldPubRankings}`
);

await mongoose.disconnect();
process.exit(0);
