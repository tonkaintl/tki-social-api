// ----------------------------------------------------------------------------
// scripts/seed-ai-tells.js
//
// Pre-populates the writers_room_tells collection with the AI-slop patterns
// + brand-forbidden words we've identified so far. Safe to re-run — uses
// upsert on (category + pattern), so existing rows are kept and only
// missing patterns get inserted. Edits to severity/active via the admin
// UI are NOT clobbered.
//
// Usage:
//   node scripts/seed-ai-tells.js
//
// Requires MONGODB_TKISOCIAL_URI in the environment.
// ----------------------------------------------------------------------------

import mongoose from 'mongoose';

import connectToDb from '../src/config/database.js';
import { config } from '../src/config/env.js';
import WritersRoomTell from '../src/models/writersRoomTell.model.js';

// Pattern dictionary. Add new ones here as you spot them — re-run the
// script to upsert. Existing rows the admin tuned via the UI keep their
// severity/active/notes values.
const SEED_TELLS = [
  // ── AI tells — moralistic/inspirational closes ───────────────────────────
  {
    category: 'ai_tell',
    notes: 'Generic "and that\'s how you stay in business" close',
    pattern: 'long haul',
    severity: 'high',
  },
  {
    category: 'ai_tell',
    notes: 'Aphoristic AI sermon close',
    pattern: 'every X learns this lesson',
    pattern_type: 'regex',
    severity: 'medium',
  },
  {
    category: 'ai_tell',
    notes: '"The X doesn\'t lie" semicolon-metaphor construction',
    pattern: "doesn't lie",
    severity: 'medium',
  },
  {
    category: 'ai_tell',
    notes: 'em-dash + inspirational pivot',
    pattern: '— and that\'s how',
    severity: 'high',
  },
  { category: 'ai_tell', pattern: 'in conclusion', severity: 'high' },
  { category: 'ai_tell', pattern: 'at the end of the day', severity: 'medium' },
  { category: 'ai_tell', pattern: 'the bottom line is', severity: 'medium' },
  {
    category: 'ai_tell',
    notes: 'AI moralism about learning',
    pattern: 'the smart ones learn it',
    severity: 'high',
  },
  {
    category: 'ai_tell',
    notes: 'Generic LinkedIn fortune-cookie',
    pattern: 'transparency sells',
    severity: 'high',
  },
  {
    category: 'ai_tell',
    notes: 'Trust-cliché',
    pattern: 'trust is earned, not bought',
    severity: 'high',
  },

  // ── AI tells — first-person fabrication ──────────────────────────────────
  {
    category: 'ai_tell',
    notes: 'AI fabricating personal experience',
    pattern: 'a buyer I knew',
    severity: 'high',
  },
  {
    category: 'ai_tell',
    pattern: 'in my experience',
    severity: 'high',
  },
  { category: 'ai_tell', pattern: 'back when I', severity: 'high' },
  {
    category: 'ai_tell',
    notes: 'Brand-as-collective fabricating a specific event',
    pattern: 'we had a buyer',
    severity: 'high',
  },
  {
    category: 'ai_tell',
    pattern: 'we had a customer',
    severity: 'high',
  },

  // ── Preamble bleed-through ────────────────────────────────────────────────
  {
    category: 'preamble',
    notes: 'Response preamble that leaked through into the article',
    pattern: 'here is the',
    severity: 'high',
  },
  {
    category: 'preamble',
    pattern: 'certainly!',
    severity: 'high',
  },
  {
    category: 'preamble',
    pattern: 'sure, here',
    severity: 'high',
  },
  {
    category: 'preamble',
    notes: 'Markdown code fence in plain-text output',
    pattern: '```',
    severity: 'medium',
  },

  // ── Weasel words / writer-talking-about-writing ──────────────────────────
  {
    category: 'weasel_words',
    notes: 'Writer talking about writing',
    pattern: 'fluff',
    severity: 'medium',
  },
  {
    category: 'weasel_words',
    pattern: 'long-form content',
    severity: 'medium',
  },
  { category: 'weasel_words', pattern: 'seamlessly', severity: 'medium' },
  { category: 'weasel_words', pattern: 'leverage', severity: 'medium' },
  { category: 'weasel_words', pattern: 'synergy', severity: 'medium' },
  { category: 'weasel_words', pattern: 'unpack', severity: 'low' },
  {
    category: 'weasel_words',
    notes: 'Generic "let\'s dive in" intro',
    pattern: "let's dive",
    severity: 'medium',
  },
  {
    category: 'weasel_words',
    pattern: 'in today\'s fast-paced',
    severity: 'high',
  },
  {
    category: 'weasel_words',
    notes: 'Marketing-fluff transition',
    pattern: 'when it comes to',
    severity: 'low',
  },

  // ── Brand-forbidden — words people don't actually use ────────────────────
  {
    category: 'brand_forbidden',
    notes: 'AI-discovered industry jargon — real buyers say "iron" or "trucks"',
    pattern: 'yellow iron',
    severity: 'low',
  },
  {
    category: 'brand_forbidden',
    notes: 'Corporate language Tonka voice avoids',
    pattern: 'best in class',
    severity: 'medium',
  },
  {
    category: 'brand_forbidden',
    pattern: 'premium quality',
    severity: 'medium',
  },
];

async function main() {
  if (!config.MONGODB_TKISOCIAL_URI) {
    console.error('MONGODB_TKISOCIAL_URI not set in env — aborting');
    process.exit(1);
  }
  await connectToDb(config.MONGODB_TKISOCIAL_URI);

  let inserted = 0;
  let skipped = 0;
  for (const tell of SEED_TELLS) {
    try {
      // Use updateOne with upsert + $setOnInsert so existing rows the
      // admin tuned via UI are preserved. Only inserts when missing.
      const res = await WritersRoomTell.updateOne(
        { category: tell.category, pattern: tell.pattern },
        {
          $setOnInsert: {
            active: true,
            category: tell.category,
            created_by: 'seed-script',
            notes: tell.notes || '',
            pattern: tell.pattern,
            pattern_type: tell.pattern_type || 'substring',
            severity: tell.severity || 'medium',
          },
        },
        { upsert: true }
      );
      if (res.upsertedCount > 0) {
        inserted++;
        console.log(`  + ${tell.category}: ${tell.pattern}`);
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(
        `  ! failed to seed ${tell.category}/${tell.pattern}:`,
        err.message
      );
    }
  }

  console.log(
    `\nDone. Inserted ${inserted} new tells, skipped ${skipped} existing.`
  );
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
