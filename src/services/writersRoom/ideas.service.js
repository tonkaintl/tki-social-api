// ----------------------------------------------------------------------------
// Writers Room Ideas — CRUD + cron-facing selector for the writers_room_ideas
// collection. Replaces ideaRotation.js (SEASON-01-IDEAS.md cursor) as the
// rotation source. The .md file stays in the repo for human reference; this
// service is the runtime source of truth.
//
// Cron path:
//   takeNextIdeaFromDb()      → atomic find-and-flip to IN_PROGRESS
//   markIdeaUsed(id, runId)   → after pipeline returns, stamp USED + runId
//
// Frontend path:
//   listIdeas / getIdea / createIdea / updateIdea / deleteIdea / reorderIdeas
// ----------------------------------------------------------------------------

import mongoose from 'mongoose';

import {
  IDEA_DEFAULT_SEASON,
  IDEA_STATUS,
  IDEAS_PAGINATION,
  PIPELINE_ERROR_CODE,
} from '../../constants/writersroom.js';
import WritersRoomIdea from '../../models/writersRoomIdea.model.js';
import { logger } from '../../utils/logger.js';

// ── Selector ────────────────────────────────────────────────────────────────

// Peek the next idea the cron would consume WITHOUT flipping its status.
// Used by GET /next-idea so the operator can verify the rotation before the
// cron fires.
export async function peekNextIdeaFromDb(season = IDEA_DEFAULT_SEASON) {
  const idea = await WritersRoomIdea.findOne({
    season,
    status: IDEA_STATUS.UNUSED,
  })
    // Position is the primary sort key — it's what the frontend reorders.
    // _id is the deterministic tie-breaker when two ideas share a position.
    // eslint-disable-next-line perfectionist/sort-objects
    .sort({ position: 1, _id: 1 })
    .lean();

  const [totalIdeas, usedCount, remainingCount] = await Promise.all([
    WritersRoomIdea.countDocuments({ season }),
    WritersRoomIdea.countDocuments({ season, status: IDEA_STATUS.USED }),
    WritersRoomIdea.countDocuments({ season, status: IDEA_STATUS.UNUSED }),
  ]);

  return {
    idea: idea || null,
    remaining: remainingCount,
    season,
    total_ideas: totalIdeas,
    used: usedCount,
  };
}

// Atomically claim the next available idea (flip UNUSED → IN_PROGRESS) and
// return it. Throws IDEAS_SEASON_EXHAUSTED when there are no more pending
// ideas left in the season — the cron treats that as "log + skip", not a
// failure.
export async function takeNextIdeaFromDb(season = IDEA_DEFAULT_SEASON) {
  const now = new Date();
  // findOneAndUpdate with sort = atomic claim. Two cron fires racing here
  // each get a different idea instead of both grabbing the same one.
  const idea = await WritersRoomIdea.findOneAndUpdate(
    { season, status: IDEA_STATUS.UNUSED },
    {
      $set: { status: IDEA_STATUS.IN_PROGRESS, updated_at: now },
    },
    {
      new: true,
      // Position-first sort: cron consumes ideas in the frontend's chosen
      // order, falling back to _id as a stable tie-breaker.
      // eslint-disable-next-line perfectionist/sort-objects
      sort: { position: 1, _id: 1 },
    }
  ).lean();

  if (!idea) {
    const err = new Error(
      `No unused ideas left in season "${season}" — season complete.`
    );
    err.code = PIPELINE_ERROR_CODE.IDEAS_SEASON_EXHAUSTED;
    throw err;
  }

  logger.info('[WritersRoom] Idea claimed by cron', {
    category: idea.category,
    id: idea._id?.toString(),
    season: idea.season,
    title: idea.title,
  });

  return idea;
}

// Called after the pipeline finishes (success OR failure — either way the
// idea has been "consumed"). Flips IN_PROGRESS → USED and stamps the run id
// + bumps run_count for archive linking.
export async function markIdeaUsed(ideaId, runId) {
  if (!ideaId || !mongoose.Types.ObjectId.isValid(ideaId)) return null;
  const now = new Date();
  return WritersRoomIdea.findByIdAndUpdate(
    ideaId,
    {
      $inc: { run_count: 1 },
      $set: {
        last_run_id: runId || null,
        status: IDEA_STATUS.USED,
        updated_at: now,
        used_at: now,
      },
    },
    { new: true }
  ).lean();
}

// Roll an in-flight idea back to UNUSED. Used when the pipeline fails so
// hard it never reaches markIdeaUsed (e.g. story_seed validation error after
// we already claimed it). Otherwise we'd permanently lose the idea.
export async function releaseIdea(ideaId) {
  if (!ideaId || !mongoose.Types.ObjectId.isValid(ideaId)) return null;
  return WritersRoomIdea.findByIdAndUpdate(
    ideaId,
    {
      $set: { status: IDEA_STATUS.UNUSED, updated_at: new Date() },
    },
    { new: true }
  ).lean();
}

// Admin reset — flip an idea back to UNUSED so the cron picks it again.
// Use when a run produced bad output and you want a fresh attempt at the
// same topic. Keeps `run_count` and `last_run_id` intact so the history is
// preserved (next run will increment run_count to 2+ and overwrite
// last_run_id with the new run). Clears `used_at` so the admin UI shows
// the idea as truly fresh again.
export async function resetIdea(ideaId) {
  if (!ideaId || !mongoose.Types.ObjectId.isValid(ideaId)) return null;
  return WritersRoomIdea.findByIdAndUpdate(
    ideaId,
    {
      $set: {
        status: IDEA_STATUS.UNUSED,
        updated_at: new Date(),
        used_at: null,
      },
    },
    { new: true }
  ).lean();
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function listIdeas({
  category = null,
  limit = IDEAS_PAGINATION.DEFAULT_LIMIT,
  page = IDEAS_PAGINATION.DEFAULT_PAGE,
  season = null,
  status = null,
} = {}) {
  const filter = {};
  if (season) filter.season = season;
  if (status) filter.status = status;
  if (category) filter.category = category;

  const skip = (page - 1) * limit;
  const [items, totalCount] = await Promise.all([
    WritersRoomIdea.find(filter)
      // Position-primary sort with season + _id as tie-breakers — matches
      // how the frontend table is rendered.
      // eslint-disable-next-line perfectionist/sort-objects
      .sort({ position: 1, season: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WritersRoomIdea.countDocuments(filter),
  ]);

  return {
    count: items.length,
    ideas: items,
    page,
    totalCount,
    totalPages: limit === 0 ? 1 : Math.ceil(totalCount / limit),
  };
}

export async function getIdea(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return WritersRoomIdea.findById(id).lean();
}

// Pick the next position in the season by adding 10 to the current max —
// gives the frontend room to insert between two ideas without renumbering.
async function nextPositionInSeason(season) {
  const last = await WritersRoomIdea.findOne({ season })
    .sort({ position: -1 })
    .lean();
  return last ? last.position + 10 : 10;
}

export async function createIdea(data, createdBy = null) {
  const season = data.season || IDEA_DEFAULT_SEASON;
  // If the caller doesn't supply a position, append to the end of the
  // season (sparse-numbered so reorders don't cascade).
  const position =
    typeof data.position === 'number'
      ? data.position
      : await nextPositionInSeason(season);

  const doc = await WritersRoomIdea.create({
    ...data,
    created_by: createdBy,
    position,
    season,
  });
  return doc.toObject();
}

const ALLOWED_PATCH_FIELDS = [
  'category',
  'notes',
  'position',
  'season',
  'status',
  'title',
];

export async function updateIdea(id, data) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const updates = {};
  for (const key of ALLOWED_PATCH_FIELDS) {
    if (data[key] !== undefined) updates[key] = data[key];
  }
  if (Object.keys(updates).length === 0) return getIdea(id);
  updates.updated_at = new Date();

  return WritersRoomIdea.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  ).lean();
}

// Soft delete by default — flips to RETIRED so historical runs still
// resolve their last_run_id pointer cleanly. Pass { hard: true } to wipe
// the row entirely.
export async function deleteIdea(id, { hard = false } = {}) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  if (hard) {
    const res = await WritersRoomIdea.deleteOne({ _id: id });
    return res.deletedCount === 1 ? { deleted: true, hard: true } : null;
  }
  const doc = await WritersRoomIdea.findByIdAndUpdate(
    id,
    {
      $set: {
        status: IDEA_STATUS.RETIRED,
        updated_at: new Date(),
      },
    },
    { new: true }
  ).lean();
  return doc ? { deleted: true, hard: false, idea: doc } : null;
}

// Bulk reorder. Frontend sends [{ id, position }, …]; we apply each in a
// single bulkWrite so the whole reorder lands atomically per row. Position
// numbers are the source of truth — clients pick whatever spacing they want
// (we recommend multiples of 10 so insertions don't cascade).
export async function reorderIdeas(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return { matchedCount: 0, modifiedCount: 0 };
  }
  const ops = [];
  const now = new Date();
  for (const { id, position } of items) {
    if (!mongoose.Types.ObjectId.isValid(id)) continue;
    if (typeof position !== 'number') continue;
    ops.push({
      updateOne: {
        filter: { _id: id },
        update: { $set: { position, updated_at: now } },
      },
    });
  }
  if (ops.length === 0) return { matchedCount: 0, modifiedCount: 0 };
  const result = await WritersRoomIdea.bulkWrite(ops);
  return {
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0,
  };
}

// Distinct seasons currently held in the collection — used by the
// frontend to populate the season dropdown.
export async function listSeasons() {
  return WritersRoomIdea.distinct('season');
}
