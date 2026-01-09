import mongoose from 'mongoose';

import { SPARK_GROUP_VALUES } from '../constants/sparks.js';
import { FEED_CATEGORY_VALUES } from '../constants/tonkaDispatch.js';

const Schema = mongoose.Schema;

// Sparks schema for blog ideas
const sparksSchema = new Schema({
  categories: {
    default: [],
    enum: FEED_CATEGORY_VALUES,
    required: true,
    type: [String],
  },
  concept: {
    required: true,
    trim: true,
    type: String,
  },
  created_at: {
    default: Date.now,
    type: Date,
  },
  group: {
    enum: SPARK_GROUP_VALUES,
    index: true,
    type: String,
  },
  last_used: {
    type: Date,
  },
  release_order: {
    default: 0,
    min: 0,
    type: Number,
  },
  section: {
    index: true,
    required: true,
    trim: true,
    type: String,
    unique: true,
  },
  thesis: {
    required: true,
    trim: true,
    type: String,
  },
  times_used: {
    default: 0,
    min: 0,
    type: Number,
  },
  updated_at: {
    default: Date.now,
    type: Date,
  },
});

// Indexes for efficient querying
sparksSchema.index({ created_at: -1 });
sparksSchema.index({ release_order: 1 });
sparksSchema.index({ last_used: -1 });
sparksSchema.index({ times_used: -1 });
sparksSchema.index({ categories: 1 });
sparksSchema.index({ group: 1 });

const Sparks = mongoose.model('Sparks', sparksSchema, 'sparks');

export default Sparks;
