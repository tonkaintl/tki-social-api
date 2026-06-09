import mongoose from 'mongoose';

// ----------------------------------------------------------

var Schema = mongoose.Schema;

// Article subdocument schema
var articleSchema = new Schema({
  added_at: {
    default: Date.now,
    type: Date,
  },
  custom_category: String,
  custom_image_url: String,
  custom_link: String,
  custom_order: {
    required: true,
    type: Number,
  },
  custom_snippet: String,
  custom_source_name: String,
  custom_title: String,
  // When true, render no image at all — overrides both custom_image_url and
  // the ranking's og_image_url. Missing is treated as false.
  hide_image: {
    default: false,
    type: Boolean,
  },
  is_manual_section: {
    default: false,
    type: Boolean,
  },
  tonka_dispatch_rankings_id: {
    ref: 'tonka_dispatch_rankings',
    type: Schema.Types.ObjectId,
  },
  updated_at: {
    default: Date.now,
    type: Date,
  },
});

// Lead spark subdocument: a denormalized snapshot of a Tonka Spark Post that
// runs as the newsletter's lead-in above the article list. Stored as-is from
// the frontend (not a live join); null when the newsletter has no lead.
var leadSparkSchema = new Schema(
  {
    blurb: String, // stripped + cropped teaser from the spark draft body
    image_url: String, // first visual_prompts[].images[].url — becomes the hero
    link: String, // manually pasted public URL
    spark_post_id: String, // Spark content_id (UUID); may fall back to _id
    title: String, // Spark final_draft.title
  },
  { _id: false }
);

// Newsletter schema
var tonkaDispatchNewsletterSchema = new Schema({
  articles: [articleSchema],
  created_at: {
    default: Date.now,
    type: Date,
  },
  hero_image_url: String,
  html_content: {
    default: '',
    type: String,
  },
  // User-controlled "used" toggle (independent of status).
  is_used: {
    default: false,
    type: Boolean,
  },
  lead_spark: {
    default: null,
    type: leadSparkSchema,
  },
  scheduled_date: Date,
  sent_date: Date,
  source_batch_id: String,
  status: {
    default: 'draft',
    enum: ['draft', 'generated', 'scheduled', 'sent'],
    required: true,
    type: String,
  },
  testing_emails: [String],
  title: {
    required: true,
    type: String,
  },
  updated_at: {
    default: Date.now,
    type: Date,
  },
});

// ----------------------------------------------------------
// Indexes
// ----------------------------------------------------------
tonkaDispatchNewsletterSchema.index({ created_at: -1, status: 1 });
tonkaDispatchNewsletterSchema.index({ source_batch_id: 1 });
tonkaDispatchNewsletterSchema.index({ scheduled_date: 1 });
tonkaDispatchNewsletterSchema.index({ sent_date: 1 });

// ----------------------------------------------------------
// Middleware
// ----------------------------------------------------------
tonkaDispatchNewsletterSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

// ----------------------------------------------------------
// Model Export
// ----------------------------------------------------------
const TonkaDispatchNewsletter = mongoose.model(
  'tonka_dispatch_newsletters',
  tonkaDispatchNewsletterSchema
);

export default TonkaDispatchNewsletter;
