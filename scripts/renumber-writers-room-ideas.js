// ----------------------------------------------------------------------------
// scripts/renumber-writers-room-ideas.js
//
// Compacts positions in a writers_room_ideas season to a dense 1..N sequence
// in the current sort order. Useful after manual edits leave gaps, or when
// you want the position to read like a row number instead of a sparse index.
//
// Idempotent — re-running is a no-op once positions are already 1..N.
// Order-preserving — uses the current position ASC, _id ASC sort, so the
// rotation order doesn't change.
//
// Usage:
//   node scripts/renumber-writers-room-ideas.js              # season_01
//   node scripts/renumber-writers-room-ideas.js season_02    # other season
//
// Heads-up: drops the "leave gaps for inserts" headroom. After this runs,
// inserting between rows 14 and 15 means another renumber. For an actively
// edited list, sparse positions (multiples of 10) are friendlier.
// ----------------------------------------------------------------------------

import mongoose from 'mongoose';

import connectToDb from '../src/config/database.js';
import { config } from '../src/config/env.js';
import { IDEA_DEFAULT_SEASON } from '../src/constants/writersroom.js';
import WritersRoomIdea from '../src/models/writersRoomIdea.model.js';

async function main() {
  if (!config.MONGODB_TKISOCIAL_URI) {
    console.error('MONGODB_TKISOCIAL_URI not set in env — aborting');
    process.exit(1);
  }
  await connectToDb(config.MONGODB_TKISOCIAL_URI);

  const season = process.argv[2] || IDEA_DEFAULT_SEASON;

  const ideas = await WritersRoomIdea.find({ season })
    // eslint-disable-next-line perfectionist/sort-objects
    .sort({ position: 1, _id: 1 })
    .lean();

  if (ideas.length === 0) {
    console.log(`No ideas found for season "${season}". Nothing to renumber.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`Renumbering ${ideas.length} ideas in season "${season}"...\n`);

  const ops = [];
  let updated = 0;
  let unchanged = 0;
  for (let i = 0; i < ideas.length; i++) {
    const idea = ideas[i];
    const newPosition = i + 1;
    if (idea.position === newPosition) {
      unchanged++;
      continue;
    }
    ops.push({
      updateOne: {
        filter: { _id: idea._id },
        update: { $set: { position: newPosition, updated_at: new Date() } },
      },
    });
    console.log(`  ${idea.position} → ${newPosition}  ${idea.title}`);
    updated++;
  }

  if (ops.length > 0) {
    await WritersRoomIdea.bulkWrite(ops);
  }

  console.log(
    `\nDone. Updated ${updated} positions, ${unchanged} already correct.`
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Renumber failed:', err);
  process.exit(1);
});
