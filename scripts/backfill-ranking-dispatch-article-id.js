/**
 * backfill-ranking-dispatch-article-id.js
 * Relinks tonka_dispatch_rankings to their source dispatch_articles.
 *
 * The ranked/used/unranked state of an article is derived by joining
 * dispatch_articles._id  ←→  tonka_dispatch_rankings.dispatch_article_id.
 * Rankings ingested via the webhook without a valid article_id (and any old
 * docs predating the link) have dispatch_article_id = null/missing, which makes
 * their article look "unranked". This matches each such ranking to a
 * dispatch_article by URL (ranking.link, falling back to ranking.canonical_id)
 * and sets the link.
 *
 * Only rankings missing the link are touched; existing links are left as-is.
 * Ambiguous matches (one URL → multiple articles) are skipped and reported.
 *
 * Usage:
 *   node scripts/backfill-ranking-dispatch-article-id.js --dry-run  # report only
 *   node scripts/backfill-ranking-dispatch-article-id.js            # live update
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import DispatchArticle from '../src/models/dispatchArticle.model.js';
import TonkaDispatchRanking from '../src/models/tonkaDispatchRankings.model.js';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

const MONGO_URI = process.env.MONGODB_TKISOCIAL_URI;
if (!MONGO_URI) {
  console.error('MONGODB_TKISOCIAL_URI not set in .env');
  process.exit(1);
}

// Rankings with no source-article link yet.
const missingFilter = {
  $or: [
    { dispatch_article_id: null },
    { dispatch_article_id: { $exists: false } },
  ],
};

await mongoose.connect(MONGO_URI);

try {
  console.log(
    `Mode: ${DRY_RUN ? 'DRY RUN (no update)' : 'LIVE (sets dispatch_article_id)'}\n`
  );

  const missing = await TonkaDispatchRanking.find(missingFilter).select(
    '_id link canonical_id'
  );

  console.log(
    `tonka_dispatch_rankings missing dispatch_article_id: ${missing.length}`
  );

  if (missing.length === 0) {
    console.log('\nNothing to backfill. Every ranking is already linked.');
  } else {
    // Resolve each ranking's best URL, then look up all candidate articles in
    // one query and build a url -> [articleId] map.
    const urlFor = r => r.link || r.canonical_id || null;
    const urls = [...new Set(missing.map(urlFor).filter(Boolean))];

    const articles = await DispatchArticle.find({
      link: { $in: urls },
    }).select('_id link');

    const urlToArticleIds = new Map();
    for (const a of articles) {
      const list = urlToArticleIds.get(a.link) || [];
      list.push(a._id);
      urlToArticleIds.set(a.link, list);
    }

    const ops = [];
    let noUrl = 0;
    let unmatched = 0;
    let ambiguous = 0;

    for (const r of missing) {
      const url = urlFor(r);
      if (!url) {
        noUrl++;
        continue;
      }
      const matches = urlToArticleIds.get(url);
      if (!matches || matches.length === 0) {
        unmatched++;
        continue;
      }
      if (matches.length > 1) {
        ambiguous++;
        console.warn(
          `  ambiguous: ranking ${r._id} url "${url}" → ${matches.length} articles, skipped`
        );
        continue;
      }
      ops.push({
        updateOne: {
          filter: { _id: r._id },
          update: { $set: { dispatch_article_id: matches[0] } },
        },
      });
    }

    console.log('\nResolution summary:');
    console.log(`  linkable (1:1 match) : ${ops.length}`);
    console.log(`  no url on ranking    : ${noUrl}`);
    console.log(`  url not in articles  : ${unmatched}`);
    console.log(`  ambiguous (skipped)  : ${ambiguous}`);

    if (DRY_RUN) {
      console.log('\nDry run complete. No records were updated.');
    } else if (ops.length === 0) {
      console.log('\nNo 1:1 matches to apply.');
    } else {
      const result = await TonkaDispatchRanking.bulkWrite(ops, {
        ordered: false,
      });
      console.log('\nBackfill complete:');
      console.log(`  matched : ${result.matchedCount}`);
      console.log(`  modified: ${result.modifiedCount}`);
    }
  }
} catch (error) {
  console.error('\nBackfill failed:');
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
