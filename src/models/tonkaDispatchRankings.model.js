import mongoose from 'mongoose';

// ----------------------------------------------------------

var Schema = mongoose.Schema;

// Flat schema - one ranking per document
var tonkaDispatchRankingSchema = new Schema({
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
  feed_match_reason: String,
  feed_match_status: String,
  link: String,
  match_method: String,
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
