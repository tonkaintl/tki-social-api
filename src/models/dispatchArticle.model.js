import mongoose from 'mongoose';

const dispatchArticleSchema = new mongoose.Schema(
  {
    author: { type: String },
    categories: [String],
    category: { type: String },
    content: { type: String }, // content:encoded or description
    content_snippet: { type: String },
    // Deduplication
    guid: { required: true, type: String },
    link: { required: true, type: String },
    pub_date: { type: String },

    published_at_ms: { required: true, type: Number },

    // AI relevance scoring
    relevance: {
      score: { default: -1, max: 100, min: -1, type: Number },
      usage: {
        completion_tokens: { type: Number },
        prompt_tokens: { type: Number },
        total_cost: { type: Number },
        total_tokens: { type: Number },
      },
    },
    // Source tracking (references tonka_dispatch_rss_links._id)
    rss_link_id: {
      ref: 'tonka_dispatch_rss_links',
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    tier: { type: String },

    // Core RSS fields
    title: { required: true, type: String },
  },
  {
    strict: false,
    timestamps: false,
  }
);

// Unique constraint for deduplication - manual index creation in indexes.js
// Don't define indexes here to avoid conflicts

const DispatchArticle = mongoose.model(
  'dispatch_articles',
  dispatchArticleSchema
);

export default DispatchArticle;
