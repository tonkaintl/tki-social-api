/**
 * decode-ranking-html-entities.js
 * One-off repair for tonka_dispatch_rankings stored with raw HTML entities.
 *
 * Historically, title / snippet / og_title / og_description were saved straight
 * from RSS and OG markup without decoding, so values like "Caterpillar&#39;s Q3
 * &amp; earnings" got persisted verbatim. They then render as literal garbage in
 * the UI and double-encode ("&amp;amp;") in generated newsletter HTML.
 *
 * Going forward the model decodes on write (schema setters) and the enrichment
 * parser decodes on extract, so nothing new is stored encoded. This script
 * repairs the rows already in the DB, using the SAME decoder as the write path.
 *
 * Only fields that actually change are written. Idempotent — safe to re-run.
 *
 * Usage:
 *   node scripts/decode-ranking-html-entities.js --dry-run  # report only
 *   node scripts/decode-ranking-html-entities.js            # live update
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import TonkaDispatchRanking from '../src/models/tonkaDispatchRankings.model.js';
import { decodeHtmlEntities } from '../src/utils/decodeHtmlEntities.js';

dotenv.config();

const DRY_RUN = process.argv.includes('--dry-run');

const MONGO_URI = process.env.MONGODB_TKISOCIAL_URI;
if (!MONGO_URI) {
  console.error('MONGODB_TKISOCIAL_URI not set in .env');
  process.exit(1);
}

const TEXT_FIELDS = ['title', 'snippet', 'og_title', 'og_description'];

// Anything that looks like an HTML entity: &name; &#39; &#x27;
const ENTITY_RE = /&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/i;

// Only inspect docs where at least one text field contains an entity marker.
const candidateFilter = {
  $or: TEXT_FIELDS.map(f => ({ [f]: { $regex: ENTITY_RE } })),
};

await mongoose.connect(MONGO_URI);

try {
  console.log(
    `Mode: ${DRY_RUN ? 'DRY RUN (no update)' : 'LIVE (decodes entities)'}\n`
  );

  const candidates = await TonkaDispatchRanking.find(candidateFilter)
    .select(['_id', ...TEXT_FIELDS].join(' '))
    .lean();

  console.log(`Rankings with entity-encoded text: ${candidates.length}`);

  const ops = [];
  const perField = Object.fromEntries(TEXT_FIELDS.map(f => [f, 0]));

  for (const doc of candidates) {
    const set = {};
    for (const field of TEXT_FIELDS) {
      const current = doc[field];
      if (typeof current !== 'string') continue;
      const decoded = decodeHtmlEntities(current);
      if (decoded !== current) {
        set[field] = decoded;
        perField[field] += 1;
      }
    }
    if (Object.keys(set).length > 0) {
      // Raw $set (bypasses setters) — we've already decoded with the same util.
      ops.push({
        updateOne: { filter: { _id: doc._id }, update: { $set: set } },
      });
    }
  }

  console.log('\nFields to decode:');
  for (const field of TEXT_FIELDS) {
    console.log(`  ${field.padEnd(16)}: ${perField[field]}`);
  }
  console.log(`\nDocuments to update: ${ops.length}`);

  if (DRY_RUN) {
    // Show a few before/after examples so the change is easy to eyeball.
    const samples = candidates.slice(0, 5);
    console.log('\nSample decodes:');
    for (const doc of samples) {
      for (const field of TEXT_FIELDS) {
        const current = doc[field];
        if (typeof current !== 'string') continue;
        const decoded = decodeHtmlEntities(current);
        if (decoded !== current) {
          console.log(`  [${field}]`);
          console.log(`    before: ${current}`);
          console.log(`    after : ${decoded}`);
        }
      }
    }
    console.log('\nDry run complete. No records were updated.');
  } else if (ops.length === 0) {
    console.log('\nNothing to decode. Every ranking is already clean.');
  } else {
    const result = await TonkaDispatchRanking.bulkWrite(ops, {
      ordered: false,
    });
    console.log('\nDecode complete:');
    console.log(`  matched : ${result.matchedCount}`);
    console.log(`  modified: ${result.modifiedCount}`);
  }
} catch (error) {
  console.error('\nDecode failed:');
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
