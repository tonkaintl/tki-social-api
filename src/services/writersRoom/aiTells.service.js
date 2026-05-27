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
  TELL_PAGINATION,
  TELL_PATTERN_TYPE,
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
// CRUD — used by controllers. All write paths invalidate the cache.
// ----------------------------------------------------------------------------

export async function listTells({
  active = null,
  category = null,
  limit = TELL_PAGINATION.DEFAULT_LIMIT,
  page = TELL_PAGINATION.DEFAULT_PAGE,
  severity = null,
} = {}) {
  const filter = {};
  if (active !== null) filter.active = active;
  if (category) filter.category = category;
  if (severity) filter.severity = severity;

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
