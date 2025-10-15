import mongoose from 'mongoose';

import {
  CAMPAIGN_DEFAULTS,
  CAMPAIGN_STATUS_VALUES,
  MEDIA_STORAGE,
  MEDIA_TYPE,
  MEDIA_TYPE_VALUES,
} from '../constants/campaigns.js';

// ----------------------------------------------------------

var Schema = mongoose.Schema;
var socialCampaignsSchema = new Schema({
  created_at: { default: Date.now, type: Date },
  created_by: { required: true, type: String },
  description: { type: String },
  // Media Portfolio - user-curated collection for social posting
  media_storage: { default: MEDIA_STORAGE.AZURE, type: String },
  media_urls: [
    {
      alt: { type: String },
      created_at: { default: Date.now, type: Date },
      description: { type: String },
      filename: { type: String },
      media_type: {
        default: MEDIA_TYPE.IMAGE,
        enum: MEDIA_TYPE_VALUES,
        type: String,
      },
      size: { type: Number },
      tags: [{ type: String }],
      url: { required: true, type: String },
    },
  ], // Portfolio of media objects with metadata
  short_url: { type: String },
  // Status and metadata
  status: {
    default: CAMPAIGN_DEFAULTS.STATUS,
    enum: CAMPAIGN_STATUS_VALUES,
    type: String,
  },
  stock_number: { required: true, type: String, unique: true },

  title: { required: true, type: String },
  updated_at: { default: Date.now, type: Date },

  url: { required: true, type: String },
});

socialCampaignsSchema.index({
  status: 1,
});

socialCampaignsSchema.index({
  created_at: 1,
});

const SocialCampaigns = mongoose.model(
  'social_campaigns',
  socialCampaignsSchema
);

export default SocialCampaigns;
