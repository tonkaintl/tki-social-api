// ----------------------------------------------------------------------------
// POST /webhooks/tonka-dispatch/rankings
// Tonka Dispatch content rankings webhook handler
// Receives ranked content from n8n automation and saves to database
// ----------------------------------------------------------------------------

import crypto from 'crypto';

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import TonkaDispatchRanking from '../../../models/tonkaDispatchRankings.model.js';

export const handleTonkaDispatchRankings = async (req, res) => {
  const startTime = Date.now();

  try {
    console.log('=== TONKA DISPATCH RANKINGS WEBHOOK START ===');
    console.log('Request metadata:', {
      body_is_array: Array.isArray(req.body),
      body_size_bytes: JSON.stringify(req.body).length,
      content_type: req.get('content-type'),
      method: req.method,
      request_id: req.id,
      timestamp: new Date().toISOString(),
      url: req.url,
    });

    // n8n may send data as array [{}] or direct object {}
    let payload = req.body;
    if (!Array.isArray(payload)) {
      console.log('→ Payload is not an array, wrapping in array');
      payload = [payload];
    }

    console.log('Payload type:', typeof payload);
    console.log('Rankings count:', payload.length);

    if (!payload || !Array.isArray(payload) || payload.length === 0) {
      console.error('✗ Invalid payload format', {
        is_array: Array.isArray(payload),
        length: payload?.length,
        type: typeof payload,
      });
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid payload format - expected array of rankings'
      );
    }

    console.log('→ Payload validated');

    // Generate batch ID for this submission
    const batchId = crypto.randomUUID();
    console.log('Generated batch_id:', batchId);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TONKA DISPATCH RANKINGS STRUCTURE ANALYSIS', {
      batch_id: batchId,
      rankings_count: payload.length,
    });

    // Log first ranking item for structure validation
    if (payload.length > 0) {
      console.log('First ranking item structure:', {
        has_article: !!payload[0].article,
        has_canonical_id: !!payload[0].canonical_id,
        has_rank: !!payload[0].rank,
        rank: payload[0].rank,
      });
    }

    // ------------------------------------------------------------------------
    // SAVE RANKINGS TO DATABASE
    // ------------------------------------------------------------------------
    console.log('→ Saving rankings to database...');

    const savedRankings = [];
    const errors = [];

    for (let i = 0; i < payload.length; i++) {
      const r = payload[i];
      const article = r.article || {};
      const feedMatch = article.feed_match || {};

      console.log(`Processing ranking ${i + 1}/${payload.length}:`, {
        canonical_id: r.canonical_id,
        has_article: !!r.article,
        rank: r.rank,
      });

      try {
        const ranking = await TonkaDispatchRanking.create({
          article_host: article.article_host || null,
          article_root_domain: article.article_root_domain || null,
          batch_id: batchId,
          canonical_id: r.canonical_id || null,
          category: article.category || null,
          creator: article.creator || null,
          feed_match_reason: article.feed_match_reason || null,
          feed_match_status: article.feed_match_status || null,
          link: article.link || null,
          match_method: article.match_method || null,
          pub_date_ms: article.pub_date_ms || null,
          rank: r.rank || null,
          snippet: article.snippet || null,
          source_name: article.source_name || null,
          title: article.title || null,
          tonka_dispatch_rss_links_id: feedMatch._id || null,
        });

        savedRankings.push(ranking);
        console.log(`✓ Saved ranking ${i + 1}:`, {
          _id: ranking._id,
          rank: ranking.rank,
        });
      } catch (error) {
        console.error(`✗ Failed to save ranking ${i + 1}:`, {
          error: error.message,
          rank: r.rank,
          stack: error.stack,
        });
        errors.push({
          error: error.message,
          index: i,
          rank: r.rank,
        });
      }
    }

    console.log('✓ Rankings saved to database', {
      batch_id: batchId,
      errors_count: errors.length,
      saved_count: savedRankings.length,
      total_count: payload.length,
    });

    // ------------------------------------------------------------------------
    // RESPONSE
    // ------------------------------------------------------------------------
    const processingTime = Date.now() - startTime;

    console.log('=== TONKA DISPATCH RANKINGS WEBHOOK SUCCESS ===', {
      batch_id: batchId,
      errors_count: errors.length,
      processing_time_ms: processingTime,
      saved_count: savedRankings.length,
    });

    return res.status(200).json({
      batch_id: batchId,
      errors: errors.length > 0 ? errors : undefined,
      message: 'Rankings received and processed successfully',
      saved_count: savedRankings.length,
      status: 'success',
      total_count: payload.length,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error('=== TONKA DISPATCH RANKINGS WEBHOOK ERROR ===', {
      error: error.message,
      error_name: error.name,
      processing_time_ms: processingTime,
      request_id: req.id,
      stack: error.stack,
    });

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        error_code: error.code,
        status: 'error',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      error_code: ERROR_CODES.INTERNAL_ERROR,
      status: 'error',
    });
  }
};
