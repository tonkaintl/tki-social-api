// ----------------------------------------------------------------------------
// scripts/repair-ad-punctuation.mjs
//
// One-off repair for the "AD" punctuation corruption. The Social Media
// Director's prompt schema used to require the model to echo the whole
// final_draft back, and socialMediaDirector.js took that copy over the
// editor's. On 2026-06-15 the echoed copy came back with unicode punctuation
// transcribed into literal ASCII:
//     U+2011 non-breaking hyphen -> "AD"   ("last-minute" -> "lastADminute")
//     U+2019 apostrophe          -> "AD"   ("truck's"     -> "truckADs")
//     U+2014 em dash             -> "ADAD"
//     U+2013 en dash             -> ""     ("1-5 scale"   -> "15 scale")
// and that copy is what got published.
//
// The cause is fixed (the draft no longer round-trips through that model), but
// already-published posts still hold the mangled text. This restores them from
// the pristine copy the pipeline snapshotted right after finalEditor —
// writers_room_runs.snapshots.final_draft — so nothing is guessed or rewritten:
// it is the editor's own text, byte for byte.
//
// Only draft_markdown + summary are restored. title is deliberately left alone
// (pickTitle legitimately replaces it after the snapshot is taken).
//
// Dry run by default. Pass --apply to write.
//   node scripts/repair-ad-punctuation.mjs
//   node scripts/repair-ad-punctuation.mjs --apply
// ----------------------------------------------------------------------------

import fs from 'fs';

import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');

// The corruption signature: literal "AD" welded between two lowercase letters.
// Ordinary prose never does this ("roadmap", "adjust" etc. don't match because
// AD must be uppercase and flanked by lowercase).
const SIGNATURE = /[a-z]AD[a-z]/;

// Read the URI straight from .env — this is a forensic/repair script, we don't
// want full env validation failing it over an unrelated var.
const uri = fs
  .readFileSync('.env', 'utf8')
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

// Atlas SRV lookup fails on this machine — rewrite to direct hosts.
function directUri(raw) {
  if (!raw.startsWith('mongodb+srv://')) return raw;
  const m = raw.match(/^mongodb\+srv:\/\/([^@]+)@([^/]+)\/([^?]+)(\?.*)?$/);
  const [, creds, host, dbName] = m;
  const base = host.replace(/^[^.]+\./, '');
  const prefix = host.split('.')[0];
  const hosts = [0, 1, 2]
    .map(i => `${prefix}-shard-00-0${i}.${base}:27017`)
    .join(',');
  return `mongodb://${creds}@${hosts}/${dbName}?ssl=true&replicaSet=atlas-uys7di-shard-0&authSource=admin&retryWrites=true&w=majority`;
}

const count = s => (s.match(new RegExp(SIGNATURE.source, 'g')) || []).length;

await mongoose.connect(directUri(uri));
const db = mongoose.connection.db;

const posts = await db
  .collection('tonka_spark_posts')
  .find({ 'final_draft.draft_markdown': { $regex: SIGNATURE } })
  .toArray();

console.log(
  `${posts.length} corrupted post(s) | mode: ${APPLY ? 'APPLY' : 'dry run'}\n`
);

let repaired = 0;
let skipped = 0;

for (const post of posts) {
  const run = await db
    .collection('writers_room_runs')
    .findOne({ spark_post_document_id: post._id });

  const clean = run?.snapshots?.final_draft;
  if (!clean?.draft_markdown) {
    console.log(`SKIP ${post.content_id} — no pre-corruption snapshot on file`);
    skipped += 1;
    continue;
  }

  if (SIGNATURE.test(clean.draft_markdown)) {
    console.log(`SKIP ${post.content_id} — snapshot is corrupted too`);
    skipped += 1;
    continue;
  }

  const before = count(post.final_draft.draft_markdown);
  console.log(
    `${post.content_id}\n` +
      `   draft   ${post.final_draft.draft_markdown.length} -> ${clean.draft_markdown.length} chars, ${before} "AD" -> ${count(clean.draft_markdown)}\n` +
      `   summary ${(post.final_draft.summary || '').length} -> ${(clean.summary || '').length} chars`
  );

  if (APPLY) {
    await db.collection('tonka_spark_posts').updateOne(
      { _id: post._id },
      {
        $set: {
          'final_draft.draft_markdown': clean.draft_markdown,
          'final_draft.summary': clean.summary || post.final_draft.summary,
          updated_at: new Date(),
        },
      }
    );
    console.log('   written');
  }
  repaired += 1;
}

console.log(
  `\n${APPLY ? 'repaired' : 'would repair'}: ${repaired} | skipped: ${skipped}`
);
if (!APPLY && repaired) console.log('re-run with --apply to write');

await mongoose.disconnect();
