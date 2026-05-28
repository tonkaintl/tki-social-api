// ----------------------------------------------------------------------------
// WritersRoomIdea — the idea bank that replaces SEASON-01-IDEAS.md as the
// cron rotation source. Each document is one story idea, scoped to a season
// (e.g. "season_01") with an explicit position so the frontend can drag-
// reorder without renumbering the whole list (positions are sparse).
//
// Selector contract (see ideas.service.takeNextIdeaFromDb):
//   - WHERE season = X AND status = 'unused'
//   - ORDER BY position ASC, _id ASC
//   - LIMIT 1
// When that returns nothing, the season is exhausted (we DON'T loop the
// rotation back — the user said "when every idea has a run the season is
// over"). The cron logs and skips.
// ----------------------------------------------------------------------------

import mongoose from 'mongoose';

import {
  IDEA_CATEGORY,
  IDEA_CATEGORY_VALUES,
  IDEA_DEFAULT_SEASON,
  IDEA_STATUS,
  IDEA_STATUS_VALUES,
} from '../constants/writersroom.js';

const Schema = mongoose.Schema;

const writersRoomIdeaSchema = new Schema({
  category: {
    default: IDEA_CATEGORY.COMMENTARY,
    enum: IDEA_CATEGORY_VALUES,
    index: true,
    required: true,
    type: String,
  },
  created_at: { default: Date.now, type: Date },
  created_by: { default: null, type: String },
  // Pointer to the last writers_room_runs._id that consumed this idea.
  // Lets the admin UI link an idea → its run → the spark post output.
  last_run_id: {
    default: null,
    ref: 'WritersRoomRun',
    type: Schema.Types.ObjectId,
  },
  // Freeform editorial notes — why this idea was added, the angle the
  // author wants, do-not-touch warnings, etc. Not shown to the LLM.
  notes: { default: '', type: String },
  // Sparse-ordered. Reorder operations PATCH this. Two ideas in the same
  // season can technically share a position (we tie-break on _id), but the
  // frontend should keep them unique to avoid surprises.
  position: { default: 0, index: true, type: Number },
  run_count: { default: 0, min: 0, type: Number },
  // Slug-ish label like "season_01". Lets us hold multiple seasons at
  // once and rotate independently. The frontend dropdown reads distinct
  // values from this field.
  season: {
    default: IDEA_DEFAULT_SEASON,
    index: true,
    required: true,
    trim: true,
    type: String,
  },
  status: {
    default: IDEA_STATUS.UNUSED,
    enum: IDEA_STATUS_VALUES,
    index: true,
    required: true,
    type: String,
  },
  title: { required: true, trim: true, type: String },
  updated_at: { default: Date.now, type: Date },
  used_at: { default: null, type: Date },
});

// Most common list query — by season ordered by position. Compound for
// the selector's WHERE/ORDER BY.
writersRoomIdeaSchema.index({ position: 1, season: 1, status: 1 });

// Prevent two ideas with the exact same title inside the same season —
// helpful for the seed script (idempotent re-runs) and for the frontend
// (catches accidental dupes from copy/paste).
writersRoomIdeaSchema.index({ season: 1, title: 1 }, { unique: true });

writersRoomIdeaSchema.pre('save', function bumpUpdatedAt(next) {
  if (this.isModified() && !this.isNew) this.updated_at = new Date();
  next();
});

const WritersRoomIdea = mongoose.model(
  'WritersRoomIdea',
  writersRoomIdeaSchema,
  'writers_room_ideas'
);

export default WritersRoomIdea;
