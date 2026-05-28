// ----------------------------------------------------------------------------
// WritersRoomRun — every pipeline run is logged here so we can mine failed
// runs for gems (good writer notes / research / partial drafts) and have
// a queryable archive of every piece the system has produced.
//
// Storage strategy: snapshot the *valuable* intermediate outputs after each
// major phase (router writers map, writer notes, research, head draft,
// final draft, optional outputs) — NOT the full ctx every step. The full
// ctx grows with each step and would bloat the doc.
//
// TTL index purges records after RUN_RETENTION_DAYS to keep the collection
// from growing without bound.
// ----------------------------------------------------------------------------

import mongoose from 'mongoose';

import {
  RUN_RETENTION_DAYS,
  RUN_STATUS,
  RUN_STATUS_VALUES,
  RUN_TRIGGER_VALUES,
} from '../constants/writersroom.js';

const Schema = mongoose.Schema;

// One entry per step the orchestrator ran, in execution order.
const traceEntrySchema = new Schema(
  {
    error: { type: String },
    errorCode: { type: String },
    ms: { type: Number },
    name: { required: true, type: String },
    ok: { required: true, type: Boolean },
  },
  { _id: false }
);

// Snapshot fragments — populated as each phase completes. Anything not yet
// produced stays null. Mixed type because each snapshot's internal shape
// differs (writers map vs notes-by-role vs head_draft object, etc.) and we
// don't want a schema mismatch to drop a partial-run record.
const snapshotsSchema = new Schema(
  {
    blog_post_package: { type: Schema.Types.Mixed },
    final_draft: { type: Schema.Types.Mixed },
    future_arcs: { type: Schema.Types.Mixed },
    head_draft: { type: Schema.Types.Mixed },
    head_writer_system_message: { type: String },
    research: { type: Schema.Types.Mixed },
    // { chosen, candidates, original, reason } — pickTitle node output.
    title_pick: { type: Schema.Types.Mixed },
    visual_prompts: { type: Schema.Types.Mixed },
    writer_notes: { type: Schema.Types.Mixed },
    writer_panel: { type: Schema.Types.Mixed },
    writers: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const errorSchema = new Schema(
  {
    code: { type: String },
    message: { type: String },
    stack: { type: String },
  },
  { _id: false }
);

const writersRoomRunSchema = new Schema({
  // Mongo TTL — index field on which the TTL is applied. Set to created_at
  // + RUN_RETENTION_DAYS at insert time so the index can purge it.
  created_at: { default: Date.now, index: true, type: Date },
  duration_ms: { type: Number },
  error: errorSchema,
  // True once the run was successfully POSTed/saved into tonka_spark_posts.
  // Failed/partial runs stay false even if they have a partial payload.
  final_payload: { type: Schema.Types.Mixed },
  finished_at: { type: Date },
  forwarded_to_spark_post: { default: false, type: Boolean },
  idea_rotation: {
    cursor: { type: Number },
    total_ideas: { type: Number },
  },
  // The exact input the caller supplied. Useful for replaying a failed run
  // with tweaks — copy this, edit, POST it back to /api/writers-room/run.
  input: { type: Schema.Types.Mixed },
  // Denormalized for indexing — keeps GET /runs?brand=… fast without a
  // nested-path index. Authoritative copy is inside `input`.
  project_mode: { index: true, type: String },
  // Auto-expire — Mongo TTL monitor uses this field (with expireAfterSeconds: 0)
  // to delete the doc once Date.now() passes purge_at. Set at insert.
  purge_at: { type: Date },
  request_id: { index: true, type: String },
  snapshots: snapshotsSchema,
  spark_post_document_id: {
    ref: 'TonkaSparkPosts',
    type: Schema.Types.ObjectId,
  },
  started_at: { default: Date.now, type: Date },
  status: {
    default: RUN_STATUS.RUNNING,
    enum: RUN_STATUS_VALUES,
    index: true,
    required: true,
    type: String,
  },
  story_seed: { index: true, type: String },
  target_brand: { index: true, type: String },
  trace: [traceEntrySchema],
  triggered_by: { enum: RUN_TRIGGER_VALUES, required: true, type: String },
});

// TTL index — Mongo will purge docs once `purge_at` is in the past.
// expireAfterSeconds: 0 means "expire exactly at the date in this field."
writersRoomRunSchema.index({ purge_at: 1 }, { expireAfterSeconds: 0 });

// Compound index for the most common list queries — by status + recency.
writersRoomRunSchema.index({ created_at: -1, status: 1 });

writersRoomRunSchema.pre('save', function setPurgeAt(next) {
  if (!this.purge_at) {
    const created = this.created_at || new Date();
    this.purge_at = new Date(
      created.getTime() + RUN_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );
  }
  next();
});

const WritersRoomRun = mongoose.model(
  'WritersRoomRun',
  writersRoomRunSchema,
  'writers_room_runs'
);

export default WritersRoomRun;
