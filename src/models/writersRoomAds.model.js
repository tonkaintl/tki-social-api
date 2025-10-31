import mongoose from 'mongoose';

import { SUPPORTED_PROVIDERS } from '../constants/providers.js';
import {
  AD_STATUS,
  AD_STATUS_VALUES,
  TONE_VARIANT_VALUES,
} from '../constants/writersroom.js';

// ----------------------------------------------------------

var Schema = mongoose.Schema;
var writersRoomAdsSchema = new Schema({
  ad_id: { required: true, type: String, unique: true },
  condition: { type: String },
  copy: { required: true, type: String },
  created_at: { default: Date.now, type: Date },
  date: { type: String },
  email_sent_at: { type: Date },
  end_phrase: { type: String },
  exw: { type: String },
  headline: { type: String },
  hook: { type: String },
  is_pass: { default: true, type: Boolean },
  issues: [{ type: String }],
  issues_guard: [{ type: String }],
  notifier_email: { required: true, type: String },
  photos: { type: String },
  platform_targets: [
    {
      enum: SUPPORTED_PROVIDERS,
      type: String,
    },
  ],
  price_usd: { type: String },
  rules: {
    copy_max_words: { type: Number },
    copy_min_words: { type: Number },
    max_headline_words: { type: Number },
    max_hook_words: { type: Number },
    negatives: [{ type: String }],
    require_hook_tokens: [{ type: String }],
  },
  specs: { type: String },
  status: {
    default: AD_STATUS.DRAFT,
    enum: AD_STATUS_VALUES,
    type: String,
  },
  stock_number: { type: String },
  subject: { type: String },
  tagline: { type: String },
  tone_variant: {
    enum: TONE_VARIANT_VALUES,
    type: String,
  },
  updated_at: { default: Date.now, type: Date },
});

writersRoomAdsSchema.index({
  ad_id: 1,
});

writersRoomAdsSchema.index({
  created_at: -1,
});

writersRoomAdsSchema.index({
  notifier_email: 1,
});

const WritersRoomAds = mongoose.model('writers_room_ads', writersRoomAdsSchema);

export default WritersRoomAds;
