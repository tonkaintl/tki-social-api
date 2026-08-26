// ----------------------------------------------------------------------------
// scripts/repair-draft-punctuation.mjs
//
// One-off repair for drafts mangled by the Social Media Director echo (see the
// header of src/services/writersRoom/nodes/socialMediaDirector.js). That node
// used to publish the model's re-transcribed copy of the finished draft, and
// when the transcription slipped it slipped on non-ASCII punctuation. Observed
// shapes, all from the same line:
//
//     ’ -> "9"   ("truck's" -> "truck9s")      — -> "1"  ("price—those" -> "price1those")
//     – -> "0"   ("3779–std" -> "37790std")    ‑ -> "AD" ("last-minute" -> "lastADminute")
//     plus the high-byte-drop form (U+2014 -> U+0014 etc.) that
//     utils/sanitizeControlChars.js already nets.
//
// There is no reliable signature in the published text — "9" and "AD" occur in
// legitimate words (NADA, TRADE, LOAD, CAD, model numbers). So this script does
// NOT pattern-match the post. It walks the pristine copy the pipeline
// snapshotted one node earlier (writers_room_runs.snapshots.final_draft) and
// only inspects the post at positions where the EDITOR actually wrote
// punctuation. Word collisions are structurally impossible: if the snapshot has
// no punctuation there, the script never looks there.
//
// Repairs are surgical — single characters replaced in place, anchored by
// surrounding context — so unrelated differences (later human edits via
// PATCH /api/tonka-spark-posts/:id) are preserved rather than overwritten.
//
// Dry run by default. Pass --apply to write.
//   node scripts/repair-draft-punctuation.mjs
//   node scripts/repair-draft-punctuation.mjs --apply
// ----------------------------------------------------------------------------

import fs from 'fs';

import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');

// How much surrounding text to anchor on. Long enough to be unique in a ~4k
// draft, short enough to survive a second damage site landing nearby.
const ANCHOR = 24;

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

// Repair one field against its pristine snapshot. Returns { text, fixes }.
//
// Each damage site is located by anchoring on BOTH sides: the snapshot text
// immediately before the punctuation mark and the snapshot text immediately
// after it. The gap between those two anchors in the published copy is exactly
// what replaced the mark, however wide it turned out to be — one digit ("9"),
// two ("14", "AD"), four ("ADAD"), or zero when the mark was simply dropped.
// Measuring the width instead of assuming it is what stops a repair from
// leaving a stray digit behind ("region96not" -> "region—6not").
function repairField(clean, published) {
  if (typeof clean !== 'string' || typeof published !== 'string') {
    return { fixes: [], text: published };
  }

  let out = published;
  const fixes = [];

  for (let i = 0; i < clean.length; i += 1) {
    const want = clean[i];
    // Only positions where the editor wrote a non-ASCII character.
    if (want.codePointAt(0) <= 126) continue;

    const left = clean.slice(Math.max(0, i - ANCHOR), i);
    const right = clean.slice(i + 1, i + 1 + ANCHOR);
    if (left.length < 8 || right.length < 8) continue;

    // Both anchors must be unambiguous or we could repair the wrong spot.
    const at = out.indexOf(left);
    if (at < 0 || at !== out.lastIndexOf(left)) continue;
    const pos = at + left.length;

    // The damage sometimes swallows the space next to the mark as well
    // ("deal — or" -> "deal 0or"), which leaves the right anchor unfindable.
    // Retry without its leading whitespace and put that whitespace back as
    // part of the replacement.
    let rpos = out.indexOf(right, pos);
    let tail = '';
    if (rpos < 0) {
      const trimmed = right.replace(/^ +/, '');
      if (trimmed === right || trimmed.length < 8) continue;
      tail = right.slice(0, right.length - trimmed.length);
      rpos = out.indexOf(trimmed, pos);
      if (rpos !== out.lastIndexOf(trimmed)) continue;
    } else if (rpos !== out.lastIndexOf(right)) {
      continue;
    }
    if (rpos < 0) continue;

    const width = rpos - pos;
    const got = out.slice(pos, rpos);
    if (got === want + tail) continue; // survived intact

    // Only touch damage: the mark became digits, became "AD"/"ADAD", or was
    // dropped outright. A straight ' for ’ or " for “ is sanitizeControlChars
    // normalizing on purpose — leave those alone.
    const isDamage = width === 0 || /^(?:[0-9]+|(?:AD)+)$/.test(got);
    if (!isDamage || width > 4) continue;

    fixes.push({
      after: want + tail,
      before: got,
      cleanContext: clean.slice(Math.max(0, i - 18), i + 19),
      context: out.slice(Math.max(0, pos - 18), rpos + 18),
    });
    out = out.slice(0, pos) + want + tail + out.slice(rpos);
  }

  return { fixes, text: out };
}

await mongoose.connect(directUri(uri));
const db = mongoose.connection.db;

const posts = await db
  .collection('tonka_spark_posts')
  .find({})
  .sort({ created_at: 1 })
  .toArray();

console.log(
  `scanning ${posts.length} posts | mode: ${APPLY ? 'APPLY' : 'dry run'}\n`
);

let repaired = 0;
let totalFixes = 0;
let noSnapshot = 0;

for (const post of posts) {
  const run = await db
    .collection('writers_room_runs')
    .findOne({ spark_post_document_id: post._id });
  const clean = run?.snapshots?.final_draft;
  if (!clean?.draft_markdown) {
    noSnapshot += 1;
    continue;
  }

  const draft = repairField(
    clean.draft_markdown,
    post.final_draft?.draft_markdown
  );
  const summary = repairField(clean.summary, post.final_draft?.summary);
  const fixes = [...draft.fixes, ...summary.fixes];
  if (!fixes.length) continue;

  repaired += 1;
  totalFixes += fixes.length;
  console.log(
    `${post.content_id}  ${String(post.created_at).slice(0, 10)}  ${fixes.length} fix(es)`
  );
  for (const f of fixes) {
    console.log(
      `    ${JSON.stringify(f.before)} -> ${JSON.stringify(f.after)}`
    );
    console.log(`        published: ${JSON.stringify(f.context)}`);
    console.log(`        editor   : ${JSON.stringify(f.cleanContext)}`);
  }

  if (APPLY) {
    await db.collection('tonka_spark_posts').updateOne(
      { _id: post._id },
      {
        $set: {
          'final_draft.draft_markdown': draft.text,
          'final_draft.summary': summary.text,
          updated_at: new Date(),
        },
      }
    );
    console.log('    written');
  }
}

console.log(
  `\n${APPLY ? 'repaired' : 'would repair'}: ${repaired} post(s), ${totalFixes} character(s)` +
    ` | no snapshot on file: ${noSnapshot}`
);
if (!APPLY && repaired) console.log('re-run with --apply to write');

await mongoose.disconnect();
