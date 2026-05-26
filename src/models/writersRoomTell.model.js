// ----------------------------------------------------------------------------
// WritersRoomTell — admin-managed pattern dictionary used by the
// aiTellsCheck pipeline node. Each row describes a substring or regex
// pattern that signals AI slop or brand-forbidden language. The pipeline
// scans the final draft for active patterns and attaches matches to the
// run record.
//
// Seed initial patterns via scripts/seed-ai-tells.js or POST /tells.
// ----------------------------------------------------------------------------

import mongoose from 'mongoose';

import {
  TELL_CATEGORY,
  TELL_CATEGORY_VALUES,
  TELL_PATTERN_TYPE,
  TELL_PATTERN_TYPE_VALUES,
  TELL_SEVERITY,
  TELL_SEVERITY_VALUES,
} from '../constants/writersroom.js';

const Schema = mongoose.Schema;

const writersRoomTellSchema = new Schema({
  active: { default: true, index: true, type: Boolean },
  category: {
    default: TELL_CATEGORY.AI_TELL,
    enum: TELL_CATEGORY_VALUES,
    index: true,
    required: true,
    type: String,
  },
  created_at: { default: Date.now, type: Date },
  created_by: { type: String },
  // Optional notes — why this pattern was added, an example of slop it
  // caught, anything else the admin wants to remember.
  notes: { default: '', type: String },
  // The actual pattern. For substring it's matched case-insensitively
  // via a simple text contains; for regex it's compiled at check time
  // (always with the `i` flag).
  pattern: { required: true, type: String },
  pattern_type: {
    default: TELL_PATTERN_TYPE.SUBSTRING,
    enum: TELL_PATTERN_TYPE_VALUES,
    required: true,
    type: String,
  },
  severity: {
    default: TELL_SEVERITY.MEDIUM,
    enum: TELL_SEVERITY_VALUES,
    required: true,
    type: String,
  },
  updated_at: { default: Date.now, type: Date },
});

// One pattern string per category — prevents accidental duplicates when
// admins add the same word twice.
writersRoomTellSchema.index({ category: 1, pattern: 1 }, { unique: true });

writersRoomTellSchema.pre('save', function bumpUpdatedAt(next) {
  if (this.isModified() && !this.isNew) this.updated_at = new Date();
  next();
});

const WritersRoomTell = mongoose.model(
  'WritersRoomTell',
  writersRoomTellSchema,
  'writers_room_tells'
);

export default WritersRoomTell;
