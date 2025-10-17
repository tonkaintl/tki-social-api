import mongoose from 'mongoose';

import {
  CAMPAIGN_STATUS,
  CAMPAIGN_STATUS_VALUES,
} from '../constants/campaigns.js';

// ----------------------------------------------------------

var Schema = mongoose.Schema;
var metricoolPostsSchema = new Schema({
  auto_publish: { default: false, type: Boolean },
  created_at: { default: Date.now, type: Date },
  // Metricool timestamp objects
  creation_date: {
    date_time: { type: String },
    timezone: { type: String },
  },
  // Creator information
  creator_user_id: { type: Number },
  creator_user_mail: { type: String },

  // Post settings
  draft: { default: true, type: Boolean },
  facebook_data: { type: Schema.Types.Mixed },
  // Additional Metricool fields
  first_comment_text: { type: String },

  has_not_read_notes: { default: false, type: Boolean },
  instagram_data: { type: Schema.Types.Mixed },

  linkedin_data: { type: Schema.Types.Mixed },

  // Media
  media: [{ type: String }],
  media_alt_text: [{ type: String }],
  // Our business fields
  metricool_id: { required: true, type: String },
  // Metricool fields (flattened from API response, snake_case)
  metricool_numeric_id: { type: Number }, // Metricool's numeric ID (avoid conflict with _id)

  // Provider information
  providers: [
    {
      detailed_status: { type: String },
      network: { type: String },
      provider_id: { type: String }, // Optional provider ID
      status: { type: String },
    },
  ],
  publication_date: {
    date_time: { type: String },
    timezone: { type: String },
  },

  save_external_media_files: { default: false, type: Boolean },
  shortener: { default: false, type: Boolean },
  status: {
    default: CAMPAIGN_STATUS.DRAFT,
    enum: CAMPAIGN_STATUS_VALUES,
    type: String,
  },
  stock_number: { required: true, type: String }, // Links post to inventory
  text: { type: String },

  tiktok_data: { type: Schema.Types.Mixed },
  // Platform-specific data
  twitter_data: { type: Schema.Types.Mixed },

  updated_at: { default: Date.now, type: Date },
  uuid: { type: String },
});

// Indexes for performance
metricoolPostsSchema.index({ metricool_id: 1 }, { unique: true });
metricoolPostsSchema.index({ stock_number: 1 });
metricoolPostsSchema.index({ status: 1 });
metricoolPostsSchema.index({ 'publication_date.date_time': 1 });
metricoolPostsSchema.index({ created_at: 1 });

// Update the updated_at field on save
metricoolPostsSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

const MetricoolPosts = mongoose.model('metricool_posts', metricoolPostsSchema);

export default MetricoolPosts;
