import mongoose from 'mongoose';

import {
  CAMPAIGN_STATUS,
  CAMPAIGN_STATUS_VALUES,
} from '../constants/campaigns.js';

// ----------------------------------------------------------

var Schema = mongoose.Schema;
var metricoolPostsSchema = new Schema({
  // Status tracking
  auto_publish: { default: false, type: Boolean },

  // Timestamps
  created_at: { default: Date.now, type: Date },

  // Creator info from Metricool
  creator_user_id: { type: Number },
  creator_user_mail: { type: String },

  // Publication info
  is_draft: { default: true, type: Boolean },

  // Media information
  media: [{ type: String }], // URLs from Metricool response
  media_alt_text: [{ type: String }],

  // Metricool timestamps
  metricool_creation_date: { type: Date },

  // Metricool post ID - unique identifier from Metricool API
  metricool_id: { required: true, type: String, unique: true },

  metricool_publication_date: { type: Date },

  // Complete Metricool response data
  metricool_response: { required: true, type: Schema.Types.Mixed },

  // Networks this post covers (array since one Metricool post can target multiple networks)
  networks: [{ type: String }], // ['facebook', 'instagram', etc.]

  publish_date: { type: Date },

  status: {
    default: CAMPAIGN_STATUS.DRAFT,
    enum: CAMPAIGN_STATUS_VALUES,
    type: String,
  },

  // Campaign reference
  stock_number: { required: true, type: String }, // Reference to socialCampaigns

  // Extracted key fields for easy querying
  text: { required: true, type: String },

  updated_at: { default: Date.now, type: Date },

  uuid: { required: true, type: String }, // For scheduling updates
});

// Indexes for performance
metricoolPostsSchema.index({ metricool_id: 1 }, { unique: true });
metricoolPostsSchema.index({ stock_number: 1 });
metricoolPostsSchema.index({ status: 1 });
metricoolPostsSchema.index({ publish_date: 1 });
metricoolPostsSchema.index({ created_at: 1 });

// Update the updated_at field on save
metricoolPostsSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

const MetricoolPosts = mongoose.model('metricool_posts', metricoolPostsSchema);

export default MetricoolPosts;
