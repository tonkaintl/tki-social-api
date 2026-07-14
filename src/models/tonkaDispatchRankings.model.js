import mongoose from 'mongoose';

import { decodeHtmlEntities } from '../utils/decodeHtmlEntities.js';

// ----------------------------------------------------------

var Schema = mongoose.Schema;

// Every write path (webhook ingest, service ingest, enrichment update) flows
// through these setters, so text pulled from RSS/OG markup lands in the DB as
// clean plain text — decoded exactly once, here. Nothing downstream (the
// newsletter HTML builder, the React UI) should ever need to decode again.
const htmlText = { set: decodeHtmlEntities, type: String };

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
  og_description: htmlText,
  og_image_url: String,
  og_title: htmlText,
  pub_date_ms: Number,
  rank: Number,
  snippet: htmlText,
  source_name: String,
  title: htmlText,
  tonka_dispatch_rss_links_id: String,
  // Single-use claim: set to the newsletter that uses this ranking.
  // null = available for use. An article (ranking) may only be used in
  // one newsletter at a time, regardless of newsletter status.
  used_in_newsletter_id: {
    default: null,
    index: true,
    ref: 'tonka_dispatch_newsletters',
    type: mongoose.Schema.Types.ObjectId,
  },
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
