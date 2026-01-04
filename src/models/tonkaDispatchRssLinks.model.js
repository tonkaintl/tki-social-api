import mongoose from 'mongoose';

import {
  FEED_DEFAULTS,
  FEED_FIELDS,
  FEED_TIER,
  FEED_TIER_VALUES,
} from '../constants/tonkaDispatch.js';

// ----------------------------------------------------------

var Schema = mongoose.Schema;
var tonkaDispatchRssLinksSchema = new Schema({
  category: {
    trim: true,
    type: String,
  },
  created_at: {
    default: Date.now,
    type: Date,
  },
  enabled: {
    default: FEED_DEFAULTS.ENABLED,
    type: Boolean,
  },
  feedspot_feed_id: {
    default: null,
    trim: true,
    type: String,
  },
  feedspot_folder_id: {
    default: null,
    trim: true,
    type: String,
  },
  name: {
    trim: true,
    type: String,
  },
  notes: {
    trim: true,
    type: String,
  },
  rejected_reason: {
    trim: true,
    type: String,
  },
  rss_url: {
    required: [true, 'RSS URL is required'],
    trim: true,
    type: String,
    unique: true,
  },
  tier: {
    default: FEED_DEFAULTS.TIER,
    enum: FEED_TIER_VALUES,
    required: true,
    type: String,
  },
  updated_at: {
    default: Date.now,
    type: Date,
  },
});

// Custom validation: notes required if tier is 'rejected'
tonkaDispatchRssLinksSchema.path(FEED_FIELDS.NOTES).validate(function (value) {
  if (this.tier === FEED_TIER.REJECTED && (!value || value.trim() === '')) {
    return false;
  }
  return true;
}, `Notes are required when tier is "${FEED_TIER.REJECTED}"`);

// Update updated_at timestamp on save
tonkaDispatchRssLinksSchema.pre('save', function (next) {
  this[FEED_FIELDS.UPDATED_AT] = new Date();
  next();
});

// Indexes for efficient querying
tonkaDispatchRssLinksSchema.index({
  [FEED_FIELDS.CATEGORY]: 1,
});

tonkaDispatchRssLinksSchema.index({
  [FEED_FIELDS.CREATED_AT]: -1,
});

tonkaDispatchRssLinksSchema.index({
  [FEED_FIELDS.ENABLED]: 1,
  [FEED_FIELDS.TIER]: 1,
});

const TonkaDispatchRssLinks = mongoose.model(
  'tonka_dispatch_rss_links',
  tonkaDispatchRssLinksSchema
);

export default TonkaDispatchRssLinks;
