import mongoose from 'mongoose';

import {
  CAMPAIGN_DEFAULTS,
  MEDIA_STORAGE,
  MEDIA_TYPE,
  MEDIA_TYPE_VALUES,
  METRICOOL_STATUS_VALUES,
} from '../constants/campaigns.js';
import { SUPPORTED_PROVIDERS } from '../constants/providers.js';

// ----------------------------------------------------------

var Schema = mongoose.Schema;
var socialCampaignsSchema = new Schema({
  // Base message used as foundation for all platform posts
  base_message: {
    default: '', // Will be auto-populated from item title during campaign creation
    type: String,
  },
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

  // Proposed posts for each platform (staging area before Metricool)
  proposed_posts: [
    {
      // Metricool integration tracking
      draft: {
        default: true,
        type: Boolean, // Whether this is a draft (true) or scheduled for publishing (false)
      },
      enabled: {
        default: true,
        type: Boolean, // Whether to post to this platform
      },
      media_urls: [
        {
          alt: { type: String },
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
      ], // Platform-specific media (in addition to campaign media_urls)
      metricool_created_at: {
        type: Date, // When post was created in Metricool
      },
      metricool_id: {
        type: String, // Metricool post ID when sent to Metricool
      },
      metricool_scheduled_date: {
        type: Date, // Actual scheduled date from Metricool (may differ from scheduled_date)
      },
      metricool_status: {
        enum: METRICOOL_STATUS_VALUES, // Metricool API status values (PENDING, PUBLISHED, ERROR, PUBLISHING)
        type: String,
        // null = not sent to Metricool yet
      },
      platform: {
        enum: SUPPORTED_PROVIDERS,
        required: true,
        type: String,
      },
      scheduled_date: {
        type: Date, // Platform-specific scheduling
      },
      text: {
        type: String, // Platform-specific post content
      },
    },
  ],

  short_url: { type: String },
  // Status and metadata
  status: {
    default: CAMPAIGN_DEFAULTS.STATUS,
    enum: METRICOOL_STATUS_VALUES,
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
