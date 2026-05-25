import mongoose from 'mongoose';

const Schema = mongoose.Schema;

// Tracks the rotation position through SEASON-01-IDEAS.md so the cron job
// (and manual /run calls without a story_seed) pick the next idea in order
// and wrap back to 0 after the last one. One document per rotation key.
const writersRoomIdeaCursorSchema = new Schema({
  cursor: {
    default: 0,
    min: 0,
    type: Number,
  },
  key: {
    index: true,
    required: true,
    trim: true,
    type: String,
    unique: true,
  },
  last_idea: {
    default: '',
    type: String,
  },
  last_used_at: {
    type: Date,
  },
  total_ideas: {
    default: 0,
    min: 0,
    type: Number,
  },
  updated_at: {
    default: Date.now,
    type: Date,
  },
});

const WritersRoomIdeaCursor = mongoose.model(
  'WritersRoomIdeaCursor',
  writersRoomIdeaCursorSchema,
  'writers_room_idea_cursors'
);

export default WritersRoomIdeaCursor;
