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

// Newsletter schema
var tonkaDispatchNewsletterSchema = new Schema({
  articles: [articleSchema],
  created_at: {
    default: Date.now,
    type: Date,
  },
  hero_image_url: String,
  scheduled_date: Date,
  sent_date: Date,
  source_batch_id: String,
  status: {
    default: 'draft',
    enum: ['draft', 'scheduled', 'sent'],
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
