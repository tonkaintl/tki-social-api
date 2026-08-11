// ---------------------------------------------------------------------------
// Bulk equivalent of clicking "Promote" on the Articles page, for articles that
// clear the CURRENT score floor but were never promoted — the catch-up for a
// floor that used to be set too high (DISPATCH_LOGISTICS_SCORE_MIN was 85 from
// 2026-06-08 to 2026-08-11, above the scorer's ~82 ceiling, so logistics
// promoted zero articles in that window).
//
// Writes records IDENTICAL to POST /api/dispatch/articles/:id/promote — same
// `manual-<date>` batch_id, same manual_promote provenance, same null rank,
// same dedup guard. Running this is indistinguishable from doing it by hand,
// one at a time, today.
//
// Which articles: replays the real selection rules — per-category floor, 5-day
// window per publish-day, MAX_PER_CATEGORY_IN_RESULTS per day — so it promotes
// what the pipeline WOULD have promoted, not the entire backlog.
//
//   node scripts/promote-missed-rankings.mjs                   # dry run
//   node scripts/promote-missed-rankings.mjs --go              # write
//   node scripts/promote-missed-rankings.mjs --category=marine --floor=72 --go
//   node scripts/promote-missed-rankings.mjs --all --go        # skip per-day cap
//
// Rollback: db.tonka_dispatch_rankings.deleteMany({ batch_id: "<printed id>" })
// ---------------------------------------------------------------------------
import 'dotenv/config';
import mongoose from 'mongoose';

import {
  CANDIDATE_MAX_AGE_DAYS,
  CANDIDATE_SCORE_MIN,
  DOMINANT_CATEGORY,
  DROP_LINK_PATTERNS,
  DROP_TITLE_PATTERNS,
  LOGISTICS_SCORE_MIN,
  MAX_PER_CATEGORY_IN_RESULTS,
} from '../src/constants/dispatchRanking.js';
import { MANUAL_PROMOTE } from '../src/constants/tonkaDispatch.js';

const args = process.argv.slice(2);
const GO = args.includes('--go');
const NO_CAP = args.includes('--all');
const argVal = (name, fallback) => {
  const hit = args.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : fallback;
};
const CATEGORY = argVal('category', DOMINANT_CATEGORY);
const FLOOR = Number(
  argVal(
    'floor',
    CATEGORY === DOMINANT_CATEGORY ? LOGISTICS_SCORE_MIN : CANDIDATE_SCORE_MIN
  )
);

// Atlas SRV lookup fails on this machine — rewrite to direct hosts.
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
// Registers the model behind rss_link_id so .populate() can resolve it.
await import('../src/models/tonkaDispatchRssLinks.model.js');

// Same helper as the promote controller.
function manualBatchId() {
  const day = new Date().toISOString().slice(0, 10);
  return `${MANUAL_PROMOTE.BATCH_PREFIX}-${day}`;
}

const DAY_MS = 86400000;
const scoreOf = a => a.relevance?.score ?? -1;
const dropMatch = (v, pats) => !!v && pats.some(p => p.test(v));

// Already-promoted, by both id and link (the same story lands under many guids).
const [usedIds, usedLinks] = await Promise.all([
  TonkaDispatchRanking.distinct('dispatch_article_id'),
  TonkaDispatchRanking.distinct('canonical_id'),
]);
const usedIdSet = new Set(usedIds.filter(Boolean).map(String));
const usedLinkSet = new Set(usedLinks.filter(Boolean));

const candidates = await DispatchArticle.find({
  category: CATEGORY,
  'relevance.score': { $gte: FLOOR },
})
  .populate('rss_link_id')
  .lean();

// Free pre-filters, identical to selectShortlist.
const eligible = candidates.filter(
  a =>
    a.link &&
    a.published_at_ms &&
    !usedIdSet.has(String(a._id)) &&
    !usedLinkSet.has(a.link) &&
    !dropMatch(a.title, DROP_TITLE_PATTERNS) &&
    !dropMatch(a.link, DROP_LINK_PATTERNS)
);

// Dedupe by link — highest score wins, then newest.
const byLink = new Map();
for (const a of eligible) {
  const cur = byLink.get(a.link);
  if (
    !cur ||
    scoreOf(a) > scoreOf(cur) ||
    (scoreOf(a) === scoreOf(cur) && a.published_at_ms > cur.published_at_ms)
  ) {
    byLink.set(a.link, a);
  }
}
const pool = [...byLink.values()];

// Forward-walk publish-days applying the per-day cap, so we promote what the
// pipeline would have promoted rather than the whole backlog.
let selected;
if (NO_CAP) {
  selected = pool.map(a => ({
    ...a,
    _run_day: new Date(a.published_at_ms).toISOString().slice(0, 10),
  }));
} else {
  const days = [
    ...new Set(
      pool.map(a => new Date(a.published_at_ms).toISOString().slice(0, 10))
    ),
  ].sort();
  const claimed = new Set();
  selected = [];
  for (const day of days) {
    const asOf = Date.parse(`${day}T23:59:59Z`);
    const cutoff = asOf - CANDIDATE_MAX_AGE_DAYS * DAY_MS;
    const forDay = pool
      .filter(
        a =>
          !claimed.has(a.link) &&
          a.published_at_ms >= cutoff &&
          a.published_at_ms <= asOf
      )
      .sort((x, y) => scoreOf(y) - scoreOf(x));
    for (const a of forDay.slice(0, MAX_PER_CATEGORY_IN_RESULTS)) {
      claimed.add(a.link);
      selected.push({ ...a, _run_day: day });
    }
  }
}

selected.sort((x, y) => scoreOf(y) - scoreOf(x));

const batchId = manualBatchId();

console.log(`category            : ${CATEGORY}`);
console.log(`floor               : ${FLOOR}`);
console.log(
  `per-day cap         : ${NO_CAP ? 'disabled (--all)' : MAX_PER_CATEGORY_IN_RESULTS}`
);
console.log(
  `already promoted    : ${usedIdSet.size} ids / ${usedLinkSet.size} links`
);
console.log(`clear the floor     : ${pool.length} (after dedupe + prefilters)`);
console.log(`selected to promote : ${selected.length}`);
console.log(`batch_id            : ${batchId}`);
console.log(
  `mode                : ${GO ? 'WRITE' : 'DRY RUN (pass --go to write)'}\n`
);

const ageDays = a => Math.floor((Date.now() - a.published_at_ms) / DAY_MS);
console.log('  #  score  pub-day       age  title');
selected.forEach((a, i) => {
  console.log(
    String(i + 1).padStart(3) +
      String(scoreOf(a)).padStart(7) +
      '  ' +
      a._run_day +
      String(ageDays(a) + 'd').padStart(6) +
      '  ' +
      (a.title || '').slice(0, 72)
  );
});

if (!GO) {
  console.log('\nDry run — nothing written. Re-run with --go to promote.');
  await mongoose.disconnect();
  process.exit(0);
}

let inserted = 0;
let skipped = 0;
const errors = [];
for (const a of selected) {
  try {
    // Same dedup guard as the controller.
    const existing = await TonkaDispatchRanking.findOne({
      dispatch_article_id: a._id,
    });
    if (existing) {
      skipped++;
      continue;
    }

    const feed = a.rss_link_id || {};
    await TonkaDispatchRanking.create({
      article_host: a.article_host || null,
      article_root_domain: a.article_root_domain || null,
      batch_id: batchId,
      canonical_id: a.link || null,
      category: a.category || null,
      creator: a.author || null,
      dispatch_article_id: a._id,
      feed_match_reason: MANUAL_PROMOTE.FEED_MATCH_REASON,
      feed_match_status: MANUAL_PROMOTE.FEED_MATCH_STATUS,
      link: a.link || null,
      match_method: MANUAL_PROMOTE.MATCH_METHOD,
      pub_date_ms: a.published_at_ms || null,
      rank: null,
      snippet: (a.content_snippet || '').slice(0, 500),
      source_name: feed.name || null,
      title: a.title || null,
      tonka_dispatch_rss_links_id: feed._id?.toString() || null,
      used_in_newsletter_id: null,
    });
    inserted++;
  } catch (err) {
    errors.push({ error: err.message, title: a.title });
  }
}

console.log(
  `\ninserted: ${inserted}   already-ranked (skipped): ${skipped}   errors: ${errors.length}`
);
for (const e of errors)
  console.log(`  ! ${e.title?.slice(0, 60)} — ${e.error}`);
console.log(
  `\nRollback: db.tonka_dispatch_rankings.deleteMany({ batch_id: "${batchId}" })`
);

await mongoose.disconnect();
