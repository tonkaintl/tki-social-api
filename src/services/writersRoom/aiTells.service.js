// ----------------------------------------------------------------------------
// AI-tells service — loads active tell patterns from Mongo, scans final
// drafts for matches, and exposes CRUD helpers the controllers use.
//
// Matching contract:
//   - substring patterns: case-insensitive contains
//   - regex patterns: compiled with `i` flag at scan time
// Each match returns { tell_id, pattern, category, severity, snippet, index }
// where `snippet` is the matched text (or surrounding chars for regex)
// and `index` is the character offset in the source text.
// ----------------------------------------------------------------------------

import mongoose from 'mongoose';

import {
  TELL_CATEGORY,
  TELL_PAGINATION,
  TELL_PATTERN_TYPE,
  TELL_SEVERITY,
  TELL_SEVERITY_SCORE,
} from '../../constants/writersroom.js';
import WritersRoomTell from '../../models/writersRoomTell.model.js';
import { logger } from '../../utils/logger.js';

// In-process cache — admins editing tells via /tells endpoints invalidate
// via clearTellCache(). Cron + run controllers hit this directly, so we
// don't burn a Mongo query per pipeline run.
let cache = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000; // 1 minute — short enough that edits propagate

export function clearTellCache() {
  cache = null;
  cacheLoadedAt = 0;
}

async function loadActiveTells() {
  if (cache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) return cache;
  if (mongoose.connection.readyState !== 1) return [];
  try {
    cache = await WritersRoomTell.find({ active: true }).lean();
    cacheLoadedAt = Date.now();
    return cache;
  } catch (err) {
    logger.error('[WritersRoom] aiTells: failed to load patterns', {
      error: err.message,
    });
    return [];
  }
}

// Scan text against an active patterns list. Pure function — testable
// without Mongo. Returns { tells_found, tells_count, severity_score }.
export function scanText(text, tells) {
  if (typeof text !== 'string' || text.length === 0) {
    return { severity_score: 0, tells_count: 0, tells_found: [] };
  }
  const found = [];
  const lowered = text.toLowerCase();

  for (const tell of tells) {
    if (tell.pattern_type === TELL_PATTERN_TYPE.REGEX) {
      let re;
      try {
        re = new RegExp(tell.pattern, 'gi');
      } catch {
        // Invalid regex stored in DB — skip it but log so the admin can
        // fix the row. Don't crash the pipeline over a bad pattern.
        logger.warn('[WritersRoom] aiTells: bad regex pattern, skipping', {
          pattern: tell.pattern,
          tell_id: tell._id?.toString(),
        });
        continue;
      }
      let m;
      while ((m = re.exec(text)) !== null) {
        found.push({
          category: tell.category,
          index: m.index,
          pattern: tell.pattern,
          pattern_type: tell.pattern_type,
          severity: tell.severity,
          snippet: m[0],
          tell_id: tell._id?.toString(),
        });
        // Avoid infinite loops on zero-width matches.
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    } else {
      const needle = tell.pattern.toLowerCase();
      let from = 0;
      while (true) {
        const idx = lowered.indexOf(needle, from);
        if (idx === -1) break;
        found.push({
          category: tell.category,
          index: idx,
          pattern: tell.pattern,
          pattern_type: tell.pattern_type,
          severity: tell.severity,
          snippet: text.slice(idx, idx + needle.length),
          tell_id: tell._id?.toString(),
        });
        from = idx + needle.length;
      }
    }
  }

  const severityScore = found.reduce(
    (sum, t) => sum + (TELL_SEVERITY_SCORE[t.severity] || 0),
    0
  );

  return {
    severity_score: severityScore,
    tells_count: found.length,
    tells_found: found,
  };
}

// Pipeline-facing entrypoint. Loads active tells (cached), scans text,
// returns the result. Safe to call without a DB connection — returns
// empty results in that case so the pipeline keeps running.
export async function scanDraft(text) {
  const tells = await loadActiveTells();
  if (tells.length === 0) {
    return { severity_score: 0, tells_count: 0, tells_found: [] };
  }
  return scanText(text, tells);
}

// ----------------------------------------------------------------------------
// First-person guard — absolute, non-negotiable, and intentionally NOT part
// of the admin tells dictionary (it can't be deactivated). The Tonka blog
// voice never claims personal experience, so any first-person SINGULAR
// pronoun ("I / me / my / myself") is a fabrication. "We/us/our" is allowed
// as the brand's collective voice (see the head-writer prompt), so it's
// excluded here on purpose. Caller treats count > 0 as a hard publish block.
//
// Aggressive by design: bare "I" also matches stray standalone tokens like
// "Type I" or "World War I". A false positive only downgrades a run to
// `partial` (re-runnable) — it never publishes first person — so we accept
// the trade.
// ----------------------------------------------------------------------------
export function detectFirstPerson(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { count: 0, found: [] };
  }
  const re = /\b(I|me|my|myself)\b/gi;
  const found = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    found.push({ index: m.index, snippet: m[0] });
  }
  return { count: found.length, found };
}

// ----------------------------------------------------------------------------
// Prompt-side prevention — the head writer prompt is fed a banned-phrases
// block built from the SAME dictionary the post-draft scan uses, so admin
// edits drive both prevention and detection from one source. We only inject
// the categories/patterns that translate to a useful "avoid this phrase"
// instruction:
//   - substring patterns only (the model doesn't reason in regex)
//   - ai_tell / brand_forbidden / weasel_words (preamble strings would just
//     prime the model to emit them)
//   - high/medium severity (keeps the list short and high-signal)
// ----------------------------------------------------------------------------
const PROMPT_TELL_CATEGORIES = new Set([
  TELL_CATEGORY.AI_TELL,
  TELL_CATEGORY.BRAND_FORBIDDEN,
  TELL_CATEGORY.WEASEL_WORDS,
]);
const PROMPT_TELL_SEVERITIES = new Set([
  TELL_SEVERITY.HIGH,
  TELL_SEVERITY.MEDIUM,
]);

// Active substring tells worth injecting into the head-writer prompt as
// banned phrases. Shares scanDraft's cache — no extra Mongo query per run.
export async function loadPreventableTells() {
  const tells = await loadActiveTells();
  return tells.filter(
    t =>
      t.pattern_type === TELL_PATTERN_TYPE.SUBSTRING &&
      PROMPT_TELL_CATEGORIES.has(t.category) &&
      PROMPT_TELL_SEVERITIES.has(t.severity)
  );
}

// Render banned-phrase tells as a prompt block for the head writer. Returns
// '' when there's nothing to inject so the prompt assembler can skip it.
export function formatTellsForPrompt(tells) {
  if (!Array.isArray(tells) || tells.length === 0) return '';
  const lines = tells.map(t => `- "${t.pattern}"`);
  return [
    'Banned phrases (HARD RULE — every draft is auto-scanned for these after ' +
      'writing; any match gets the entire draft rejected and unpublished, so ' +
      'do not use them or close variants):',
    ...lines,
  ].join('\n');
}

// ----------------------------------------------------------------------------
// CRUD — used by controllers. All write paths invalidate the cache.
// ----------------------------------------------------------------------------

// Escape user input before dropping it into a Mongo $regex so search terms
// with regex metacharacters (".", "(", etc.) match literally and can't throw.
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listTells({
  active = null,
  category = null,
  limit = TELL_PAGINATION.DEFAULT_LIMIT,
  page = TELL_PAGINATION.DEFAULT_PAGE,
  search = null,
  severity = null,
} = {}) {
  const filter = {};
  if (active !== null) filter.active = active;
  if (category) filter.category = category;
  if (severity) filter.severity = severity;
  if (search) {
    const safe = escapeRegExp(search);
    filter.$or = [
      { pattern: { $options: 'i', $regex: safe } },
      { notes: { $options: 'i', $regex: safe } },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, totalCount] = await Promise.all([
    WritersRoomTell.find(filter)
      .sort({ category: 1, pattern: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WritersRoomTell.countDocuments(filter),
  ]);

  return {
    count: items.length,
    page,
    tells: items,
    totalCount,
    totalPages: limit === 0 ? 1 : Math.ceil(totalCount / limit),
  };
}

export async function getTell(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return WritersRoomTell.findById(id).lean();
}

export async function createTell(data, createdBy = null) {
  const doc = await WritersRoomTell.create({
    ...data,
    created_by: createdBy,
  });
  clearTellCache();
  return doc.toObject();
}

export async function updateTell(id, data) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await WritersRoomTell.findByIdAndUpdate(
    id,
    { $set: { ...data, updated_at: new Date() } },
    { new: true, runValidators: true }
  ).lean();
  clearTellCache();
  return doc;
}

export async function deleteTell(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  const res = await WritersRoomTell.deleteOne({ _id: id });
  clearTellCache();
  return res.deletedCount === 1;
}
