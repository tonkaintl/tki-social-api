// Read-only forensic probe: compare the true Mongo bytes against test.json.
// Usage: node scripts/inspect-corruption.mjs
import fs from 'fs';

import mongoose from 'mongoose';

const CONTENT_ID = 'ed23d2c1-2a0a-4227-871c-dcbeecdefa67';

// Pull the social DB URI straight from .env (avoid full env validation).
const env = fs.readFileSync('.env', 'utf8');
const uri = env
  .split(/\r?\n/)
  .find(l => l.trim().startsWith('MONGODB_TKISOCIAL_URI='))
  ?.split('=')
  .slice(1)
  .join('=')
  .trim()
  .replace(/^["']|["']$/g, '');

if (!uri) {
  console.error('MONGODB_TKISOCIAL_URI not found in .env');
  process.exit(1);
}

function probe(label, str) {
  if (typeof str !== 'string') {
    console.log(label, '(not a string)');
    return;
  }
  for (const needle of ['aren', 'they', 'price', 'doesn', 'negotiations']) {
    const i = str.indexOf(needle);
    if (i < 0) continue;
    const seg = str.slice(i, i + needle.length + 2);
    const codes = [...seg].map(c => c.codePointAt(0).toString(16)).join(' ');
    console.log(`  ${label} @"${needle}":`, JSON.stringify(seg), '->', codes);
  }
}

await mongoose.connect(uri);
const doc = await mongoose.connection
  .collection('tonka_spark_posts')
  .findOne({ content_id: CONTENT_ID });

if (!doc) {
  console.error('doc not found');
} else {
  console.log('=== MONGO (true stored bytes) ===');
  probe('platform_summaries.x', doc.platform_summaries?.x);
  probe('final_draft.draft_markdown', doc.final_draft?.draft_markdown);
}

await mongoose.disconnect();
