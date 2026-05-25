// ----------------------------------------------------------------------------
// Idea Rotation — SEASON-01-IDEAS.md → next story_seed
//
// Reads the markdown file fresh each call so editing the list does not
// require redeploy. Filters out section headers. Persists a cursor in Mongo
// so the cron rotates one-by-one through every idea exactly once before
// repeating. The cursor wraps at totalIdeas.
// ----------------------------------------------------------------------------

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  IDEA_ROTATION,
  PIPELINE_ERROR_CODE,
} from '../../constants/writersroom.js';
import WritersRoomIdeaCursor from '../../models/writersRoomIdeaCursor.model.js';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to SEASON-01-IDEAS.md at the repo root (4 levels up from this file).
const IDEAS_FILE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  IDEA_ROTATION.FILENAME
);

// Strip leading list markers ("-", "*", numbered) and trim whitespace.
function cleanLine(line) {
  return line
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^\s*\d+\.\s+/, '')
    .trim();
}

export async function loadIdeas() {
  let raw;
  try {
    raw = await fs.readFile(IDEAS_FILE_PATH, 'utf8');
  } catch (err) {
    logger.error('[WritersRoom] Failed to read SEASON-01-IDEAS.md', {
      error: err.message,
      path: IDEAS_FILE_PATH,
    });
    const wrap = new Error('Failed to read SEASON-01-IDEAS.md');
    wrap.code = PIPELINE_ERROR_CODE.IDEA_ROTATION_READ_FAILED;
    throw wrap;
  }

  const ideas = raw
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(line => line.length > 0)
    .filter(line => !IDEA_ROTATION.SECTION_HEADERS.has(line));

  if (ideas.length === 0) {
    const err = new Error('SEASON-01-IDEAS.md has no usable ideas');
    err.code = PIPELINE_ERROR_CODE.IDEA_ROTATION_EMPTY;
    throw err;
  }

  return ideas;
}

// Read the current cursor without advancing. Used by the GET /next-idea
// debug endpoint and by the run controller when peek=true.
export async function peekNextIdea() {
  const ideas = await loadIdeas();
  const doc = await WritersRoomIdeaCursor.findOne({
    key: IDEA_ROTATION.CURSOR_KEY,
  });
  const cursor = doc ? doc.cursor % ideas.length : 0;
  return {
    cursor,
    idea: ideas[cursor],
    last_used_at: doc?.last_used_at || null,
    total_ideas: ideas.length,
  };
}

// Atomically advance the cursor and return the next idea. Wraps to 0 when
// it hits the end. This is what the cron calls to drive each run.
export async function takeNextIdea() {
  const ideas = await loadIdeas();
  const now = new Date();

  // findOneAndUpdate with upsert in one round trip; the modulo is applied
  // after the increment so we always land in range.
  const doc = await WritersRoomIdeaCursor.findOneAndUpdate(
    { key: IDEA_ROTATION.CURSOR_KEY },
    {
      $setOnInsert: { key: IDEA_ROTATION.CURSOR_KEY },
    },
    { new: true, upsert: true }
  );

  const cursor = doc.cursor % ideas.length;
  const idea = ideas[cursor];

  // Now advance and stamp metadata.
  await WritersRoomIdeaCursor.updateOne(
    { key: IDEA_ROTATION.CURSOR_KEY },
    {
      $inc: { cursor: 1 },
      $set: {
        last_idea: idea,
        last_used_at: now,
        total_ideas: ideas.length,
        updated_at: now,
      },
    }
  );

  logger.info('[WritersRoom] Idea rotation advanced', {
    cursor,
    idea,
    total_ideas: ideas.length,
  });

  return {
    cursor,
    idea,
    last_used_at: now,
    total_ideas: ideas.length,
  };
}

// Reset the cursor to 0. Exposed for testing / admin actions.
export async function resetIdeaCursor() {
  await WritersRoomIdeaCursor.updateOne(
    { key: IDEA_ROTATION.CURSOR_KEY },
    {
      $set: { cursor: 0, updated_at: new Date() },
    },
    { upsert: true }
  );
  logger.info('[WritersRoom] Idea cursor reset to 0');
}
