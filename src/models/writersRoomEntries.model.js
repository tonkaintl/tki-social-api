import mongoose from 'mongoose';

import {
  CONTENT_STATUS,
  CONTENT_STATUS_VALUES,
  PLATFORM_BRANDS_VALUES,
  PLATFORM_MODES_VALUES,
  WRITING_GENRES_VALUES,
} from '../constants/writersroom.js';

// ----------------------------------------------------------

var Schema = mongoose.Schema;

// Sub-schemas for nested structures
var CreativeSchema = new Schema(
  {
    creativity_to_reporter: { type: Number },
    fact_to_fiction: { type: Number },
    length: { type: String },
    tone_strictness: { type: Number },
  },
  { _id: false }
);

var FinalDraftSchema = new Schema(
  {
    draft_markdown: { type: String },
    role: { type: String },
    summary: { type: String },
    thesis: { type: String },
    title: { type: String },
  },
  { _id: false }
);

var StoryArcSchema = new Schema(
  {
    arc_title: { type: String },
    one_line_premise: { type: String },
    suggested_story_seed: { type: String },
    why_it_matters: { type: String },
  },
  { _id: false }
);

var FutureStoryArcGeneratorSchema = new Schema(
  {
    arcs: [StoryArcSchema],
  },
  { _id: false }
);

var PlatformSummariesSchema = new Schema(
  {
    linkedin: { type: String },
    meta: { type: String },
    tonkaintl: { type: String },
    x: { type: String },
    youtube: { type: String },
  },
  { _id: false }
);

var BrandMetaSchema = new Schema(
  {
    guidelines: {
      do: [{ type: String }],
      dont: [{ type: String }],
      style_examples: [{ type: String }],
    },
    name: { type: String },
    slug: { enum: PLATFORM_BRANDS_VALUES, type: String },
    tagline: { type: String },
    voice: { type: String },
  },
  { _id: false }
);

var ProjectSchema = new Schema(
  {
    audience: { type: String },
    brand: { enum: PLATFORM_BRANDS_VALUES, type: String },
    brand_meta: BrandMetaSchema,
    mode: { enum: PLATFORM_MODES_VALUES, type: String },
  },
  { _id: false }
);

var ProjectModeProfileSchema = new Schema(
  {
    description: { type: String },
    headWriterInstructions: [{ type: String }],
    label: { type: String },
    structureHints: [{ type: String }],
    taskLines: [{ type: String }],
  },
  { _id: false }
);

var ResearchSchema = new Schema(
  {
    citations: [{ type: String }],
    enable_research: { type: Boolean },
    facts: { type: String },
    findings: [{ type: String }],
    role: { type: String },
    sources: [{ type: String }],
    weight: { type: Number },
  },
  { _id: false }
);

var TargetBrandSchema = new Schema(
  {
    id: { enum: PLATFORM_BRANDS_VALUES, type: String },
    project: BrandMetaSchema,
  },
  { _id: false }
);

var TokensSchema = new Schema(
  {
    writer_token_count: { type: Number },
  },
  { _id: false }
);

var VisualPromptImageSchema = new Schema(
  {
    alt: { type: String },
    created_at: { default: Date.now, type: Date },
    description: { type: String },
    filename: { type: String },
    size: { type: Number },
    url: { type: String },
  },
  { _id: false }
);

var VisualPromptSchema = new Schema(
  {
    id: { type: String },
    images: [VisualPromptImageSchema],
    intent: { type: String },
    prompt: { type: String },
  },
  { _id: false }
);

var WriterNotesItemSchema = new Schema(
  {
    notes: [{ type: String }],
    role: { enum: WRITING_GENRES_VALUES, type: String },
    weight: { type: Number },
  },
  { _id: false }
);

var WriterNotesSchema = new Schema(
  {
    action: WriterNotesItemSchema,
    biography: WriterNotesItemSchema,
    comedy: WriterNotesItemSchema,
    documentary: WriterNotesItemSchema,
    historic: WriterNotesItemSchema,
    research: WriterNotesItemSchema,
    scifi: WriterNotesItemSchema,
  },
  { _id: false }
);

var WriterPanelItemSchema = new Schema(
  {
    role: { enum: WRITING_GENRES_VALUES, type: String },
    weight: { type: Number },
  },
  { _id: false }
);

var WritersConfigSchema = new Schema(
  {
    action: {
      enabled: { type: Boolean },
      weight: { type: Number },
    },
    biographer: {
      enabled: { type: Boolean },
      weight: { type: Number },
    },
    comedy: {
      enabled: { type: Boolean },
      weight: { type: Number },
    },
    documentary: {
      enabled: { type: Boolean },
      weight: { type: Number },
    },
    historic: {
      enabled: { type: Boolean },
      weight: { type: Number },
    },
    scifi: {
      enabled: { type: Boolean },
      weight: { type: Number },
    },
  },
  { _id: false }
);

var OutputsSchema = new Schema(
  {
    gdocs_folder_id: { type: String },
    output_blog_post: { type: Boolean },
    output_future_story_arc: { type: Boolean },
    output_visual_prompts: { type: Boolean },
  },
  { _id: false }
);

// Main schema
var writersRoomEntriesSchema = new Schema({
  content_id: { index: true, required: true, type: String, unique: true },
  created_at: { default: Date.now, type: Date },
  creative: CreativeSchema,
  email_sent_at: { type: Date },
  final_draft: FinalDraftSchema,
  future_story_arc_generator: FutureStoryArcGeneratorSchema,
  head_writer_system_message: { type: String },
  notifier_email: { required: false, type: String },
  outputs: OutputsSchema,
  platform_summaries: PlatformSummariesSchema,
  project: ProjectSchema,
  project_mode: { enum: PLATFORM_MODES_VALUES, type: String },
  project_mode_profile: ProjectModeProfileSchema,
  research: ResearchSchema,
  send_email: { default: false, type: Boolean },
  status: {
    default: CONTENT_STATUS.DRAFT,
    enum: CONTENT_STATUS_VALUES,
    type: String,
  },
  story_seed: { type: String },
  target_audience: { type: String },
  target_brand: TargetBrandSchema,
  title_variations: [{ type: String }],
  tokens: TokensSchema,
  updated_at: { default: Date.now, type: Date },
  visual_prompts: [VisualPromptSchema],
  writer_notes: WriterNotesSchema,
  writer_panel: [WriterPanelItemSchema],
  writers: WritersConfigSchema,
});

// Indexes for efficient querying (content_id already indexed via unique: true)
writersRoomEntriesSchema.index({ created_at: -1 });
writersRoomEntriesSchema.index({ status: 1 });
writersRoomEntriesSchema.index({ 'project.brand': 1 });
writersRoomEntriesSchema.index({ project_mode: 1 });

// Model
const WritersRoomEntries = mongoose.model(
  'WritersRoomEntries',
  writersRoomEntriesSchema,
  'writers_room_entries'
);

export default WritersRoomEntries;
