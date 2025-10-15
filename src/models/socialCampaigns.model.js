import mongoose from 'mongoose';

// ----------------------------------------------------------

var Schema = mongoose.Schema;
var socialCampaignsSchema = new Schema({
  created_at: { default: Date.now, type: Date },
  created_by: { required: true, type: String },
  description: { type: String },
  // Media storage
  media_storage: { default: 'azure', type: String },
  media_urls: [String],

  // Platform-specific content (snake_case following your pattern)
  platform_content: {
    facebook_page: {
      caption: String,
      character_count: Number,
      hashtags: [String],
      html_preview: String,
      media: [{ azure_blob_url: String, url: String }],
      share_url: String,
      utm: String,
    },
    instagram_business: {
      caption: String,
      character_count: Number,
      hashtags: [String],
      html_preview: String,
      media: [{ azure_blob_url: String, url: String }],
      share_url: String,
      utm: String,
    },
    linkedin_company: {
      caption: String,
      character_count: Number,
      hashtags: [String],
      html_preview: String,
      media: [{ azure_blob_url: String, url: String }],
      share_url: String,
      utm: String,
    },
    x_profile: {
      caption: String,
      character_count: Number,
      hashtags: [String],
      html_preview: String,
      media: [{ azure_blob_url: String, url: String }],
      share_url: String,
      utm: String,
    },
  },

  // Post tracking
  posts: [
    {
      error: String,
      external_id: String,
      internal_status: {
        default: 'created',
        enum: [
          'created',
          'drafted',
          'scheduled',
          'published',
          'failed',
          'manual_push',
        ],
        type: String,
      },
      last_status_check: Date,
      metricool_id: String,
      metricool_status: {
        enum: ['draft', 'scheduled', 'published', 'failed'],
        type: String,
      },
      platform: String,
      published_date: Date,
      scheduled_date: Date,
    },
  ],
  short_url: { type: String },
  // Status and metadata
  status: {
    default: 'pending',
    enum: ['pending', 'draft', 'scheduled', 'published', 'failed'],
    type: String,
  },
  stock_number: { required: true, type: String, unique: true },

  title: { required: true, type: String },
  updated_at: { default: Date.now, type: Date },

  url: { required: true, type: String },
});

socialCampaignsSchema.index({
  stock_number: 1,
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
