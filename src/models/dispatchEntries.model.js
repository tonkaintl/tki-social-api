import mongoose from 'mongoose';

import {
  DISPATCH_CATEGORY_VALUES,
  DISPATCH_STATUS,
  DISPATCH_STATUS_VALUES,
  GENERATION_SOURCE_VALUES,
  MEDIA_STATUS_VALUES,
} from '../constants/dispatch.js';

// ----------------------------------------------------------

const Schema = mongoose.Schema;

const dispatchEntriesSchema = new Schema({
  // Core identity fields (required at creation - "idea" stage)
  category: {
    enum: DISPATCH_CATEGORY_VALUES,
    required: true,
    type: String,
  },
  created_at: {
    default: Date.now,
    type: Date,
  },
  created_by: {
    required: true,
    type: String,
  }, // Author/creator identifier
  // Draft expansion fields (populated after idea stage)
  draft_markdown: { type: String }, // Markdown formatted draft
  draft_rich_text: { type: String }, // HTML/markdown formatted version
  draft_text: { type: String }, // AI-generated or human-written draft content
  // Notes and internal metadata
  editorial_notes: { type: String }, // Editorial feedback
  generation_metadata: {
    type: Schema.Types.Mixed, // Additional generation context
  },
  generation_model: { type: String }, // AI model used (e.g., "gpt-4", "claude-3")
  generation_prompt: { type: String }, // Prompt used for AI generation (if applicable)
  generation_source: {
    enum: GENERATION_SOURCE_VALUES,
    type: String, // How content was created
  },
  // Media/imagery fields
  imagery_prompt: { type: String }, // Prompt for image generation
  imagery_urls: [
    {
      created_at: { default: Date.now, type: Date },
      description: { type: String },
      generation_model: { type: String }, // e.g., "dall-e-3", "midjourney"
      prompt: { type: String }, // Specific prompt used
      status: {
        enum: MEDIA_STATUS_VALUES,
        type: String,
      },
      url: { type: String },
    },
  ],
  internal_notes: { type: String }, // Internal team notes
  keyframe_prompt: { type: String }, // Visual description for imagery generation
  // Publishing fields
  published_at: { type: Date }, // When entry was published
  published_url: { type: String }, // URL where entry is published
  // Iteration tracking
  revision_history: [
    {
      revised_at: { default: Date.now, type: Date },
      revised_by: { type: String },
      revision_notes: { type: String },
      version: { type: Number },
    },
  ],
  social_caption: { type: String }, // Short social media caption
  source: { type: String }, // Content generation source (e.g., "writer_room", "manual")
  // Metadata
  status: {
    default: DISPATCH_STATUS.IDEA,
    enum: DISPATCH_STATUS_VALUES,
    type: String,
  },
  summary: { type: String }, // Brief summary of the content
  tags: [{ type: String }], // Flexible tagging system
  thesis: { required: true, type: String }, // Core argument/point
  title: { required: true, type: String },
  updated_at: { default: Date.now, type: Date },
  version: { default: 1, type: Number }, // Track draft versions
});

// Indexes for efficient querying
dispatchEntriesSchema.index({ category: 1, status: 1 });
dispatchEntriesSchema.index({ created_at: -1 });
dispatchEntriesSchema.index({ created_at: -1, status: 1 });
dispatchEntriesSchema.index({ tags: 1 });

const DispatchEntries = mongoose.model(
  'dispatch_entries',
  dispatchEntriesSchema
);

export default DispatchEntries;
