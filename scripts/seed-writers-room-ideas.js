// ----------------------------------------------------------------------------
// scripts/seed-writers-room-ideas.js
//
// Imports SEASON-01-IDEAS.md into the writers_room_ideas collection so the
// cron picks ideas from Mongo instead of the .md file. Mapping:
//
//   Section "Selling & Vendors"                       → category: vendor
//   Section "Buyers & Transparency"                   → category: buyer
//   Section "Tonka Voice, Culture & Industry Insight" → category: culture
//
// Idempotent. Uses upsert on (season, title) so:
//   - Re-running won't duplicate rows.
//   - Existing rows the operator tuned via the admin UI keep their
//     status / position / notes — we only $setOnInsert the editorial
//     defaults.
//
// Usage:
//   node scripts/seed-writers-room-ideas.js
//
// Requires MONGODB_TKISOCIAL_URI in the environment.
// ----------------------------------------------------------------------------

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import mongoose from 'mongoose';

import connectToDb from '../src/config/database.js';
import { config } from '../src/config/env.js';
import {
  IDEA_CATEGORY,
  IDEA_DEFAULT_SEASON,
  IDEA_STATUS,
} from '../src/constants/writersroom.js';
import WritersRoomIdea from '../src/models/writersRoomIdea.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IDEAS_FILE_PATH = path.resolve(
  __dirname,
  '..',
  'src',
  'services',
  'writersRoom',
  'SEASON-01-IDEAS.md'
);

const SEASON = IDEA_DEFAULT_SEASON;

// File-level section headers — lines that name themselves but aren't ideas.
// The seed walks the file in order; when it sees one of these, it doesn't
// emit an idea AND it flips the "current category" for everything after.
const SECTION_TO_CATEGORY = {
  'Buyers & Transparency': IDEA_CATEGORY.BUYER,
  'Selling & Vendors': IDEA_CATEGORY.VENDOR,
  'Tonka Voice, Culture & Industry Insight': IDEA_CATEGORY.CULTURE,
};

// Lines that aren't ideas and aren't category markers — skip without
// affecting state.
const SKIP_LINES = new Set([
  'Appendix: TKI Dispatch',
  'Season 1: Master List of 75 Post Ideas',
]);

function cleanLine(line) {
  return line
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^\s*\d+\.\s+/, '')
    .trim();
}

// Parse the .md into [{ title, category, position }] in source order.
// Positions are multiples of 10 so the frontend can drag-insert rows
// between two ideas later without renumbering the whole list.
async function parseIdeas() {
  const raw = await fs.readFile(IDEAS_FILE_PATH, 'utf8');
  const items = [];
  let currentCategory = IDEA_CATEGORY.COMMENTARY;
  let position = 10;

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = cleanLine(rawLine);
    if (line.length === 0) continue;
    if (SKIP_LINES.has(line)) continue;
    if (SECTION_TO_CATEGORY[line]) {
      currentCategory = SECTION_TO_CATEGORY[line];
      continue;
    }
    items.push({
      category: currentCategory,
      position,
      title: line,
    });
    position += 10;
  }

  return items;
}

async function main() {
  if (!config.MONGODB_TKISOCIAL_URI) {
    console.error('MONGODB_TKISOCIAL_URI not set in env — aborting');
    process.exit(1);
  }
  await connectToDb(config.MONGODB_TKISOCIAL_URI);

  const ideas = await parseIdeas();
  console.log(`Parsed ${ideas.length} ideas from SEASON-01-IDEAS.md\n`);

  let inserted = 0;
  let skipped = 0;
  for (const idea of ideas) {
    try {
      const res = await WritersRoomIdea.updateOne(
        { season: SEASON, title: idea.title },
        {
          $setOnInsert: {
            category: idea.category,
            created_by: 'seed-script',
            notes: '',
            position: idea.position,
            run_count: 0,
            season: SEASON,
            status: IDEA_STATUS.UNUSED,
            title: idea.title,
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) {
        inserted++;
        console.log(`  + [${idea.category}] ${idea.title}`);
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`  ! failed to seed "${idea.title}":`, err.message);
    }
  }

  console.log(
    `\nDone. Inserted ${inserted} new ideas, skipped ${skipped} existing.`
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
