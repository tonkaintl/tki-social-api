import mongoose from 'mongoose';

// ----------------------------------------------------------

var Schema = mongoose.Schema;

// Flat schema - one ranking per document
var tonkaDispatchRankingSchema = new Schema({
  // AI enrichment
  ai_enrichment_error: String,
  ai_enrichment_status: {
    default: 'pending',
    enum: ['pending', 'success', 'failed'],
    type: String,
  },
  ai_summary: String,
  ai_summary_generated_at: Date,
  ai_summary_model: String,
  article_host: String,
  article_root_domain: String,
  batch_id: {
    index: true,
    required: true,
    type: String,
  },
  canonical_id: String,
  category: String,
  created_at: {
    default: Date.now,
    type: Date,
  },
  creator: String,
  dispatch_article_id: {
    ref: 'dispatch_articles',
    type: mongoose.Schema.Types.ObjectId,
  },
  feed_match_reason: String,
  feed_match_status: String,
  link: String,
  match_method: String,
  og_description: String,
  og_image_url: String,
  og_title: String,
  pub_date_ms: Number,
  rank: Number,
  snippet: String,
  source_name: String,
  title: String,
  tonka_dispatch_rss_links_id: String,
});

// ----------------------------------------------------------
// Indexes
// ----------------------------------------------------------
tonkaDispatchRankingSchema.index({ batch_id: 1, rank: 1 });

// ----------------------------------------------------------
// Model Export
// ----------------------------------------------------------
const TonkaDispatchRanking = mongoose.model(
  'tonka_dispatch_rankings',
  tonkaDispatchRankingSchema
);

export default TonkaDispatchRanking;
