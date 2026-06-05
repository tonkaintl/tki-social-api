// ----------------------------------------------------------------------------
// scripts/fix-slang-tells.js
//
// One-off migration. The "rig" and "iron" brand-forbidden tells (cringy slang
// the Tonka voice never uses) were stored as SUBSTRING matches, so they fired
// inside ordinary words — "rig" inside "right"/"upright"/"trigger", "iron"
// inside "environment". That blocked clean drafts at the quality gate.
//
// The ban is correct; only the matching was wrong. This converts them to
// word-boundary REGEX so they catch the standalone slang words ONLY:
//   rig  -> \brigs?\b   (matches "rig"/"rigs", not "right")
//   iron -> \biron\b    (matches "iron", not "environment")
//
// Idempotent: after conversion the old { pattern: 'rig' } rows no longer
// match, so re-running is a no-op. Safe to delete this file once applied.
//
// Usage: node scripts/fix-slang-tells.js
// ----------------------------------------------------------------------------

import mongoose from 'mongoose';

import connectToDb from '../src/config/database.js';
import { config } from '../src/config/env.js';
import WritersRoomTell from '../src/models/writersRoomTell.model.js';

const FIXES = [
  { from: 'rig', pattern: '\\brigs?\\b' },
  { from: 'iron', pattern: '\\biron\\b' },
];

async function main() {
  if (!config.MONGODB_TKISOCIAL_URI) {
    console.error('MONGODB_TKISOCIAL_URI not set — aborting');
    process.exit(1);
  }
  await connectToDb(config.MONGODB_TKISOCIAL_URI);

  for (const fix of FIXES) {
    const res = await WritersRoomTell.updateMany(
      { pattern: fix.from },
      {
        $set: {
          pattern: fix.pattern,
          pattern_type: 'regex',
          updated_at: new Date(),
        },
      }
    );
    console.log(
      `${fix.from} -> ${fix.pattern} | matched ${res.matchedCount}, modified ${res.modifiedCount}`
    );
  }

  const rows = await WritersRoomTell.find({
    pattern: { $in: FIXES.map(f => f.pattern) },
  }).lean();
  for (const r of rows) {
    console.log(
      `  now: ${r.category} | ${r.severity} | ${r.pattern_type} | ${r.pattern} | active=${r.active}`
    );
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
