// ----------------------------------------------------------------------------
// Dispatch Daily Ranking Service
// Fetches candidates, pares the pool, ranks via Anthropic, saves + emails.
// ----------------------------------------------------------------------------

import crypto from 'crypto';

import Anthropic from '@anthropic-ai/sdk';

import { config } from '../config/env.js';
import {
  CANDIDATE_EXCLUDE_USED,
  CANDIDATE_MAX_AGE_DAYS,
  CANDIDATE_SCORE_MIN,
  DISPATCH_BACKLOG_DAYS,
  DROP_LINK_PATTERNS,
  DROP_TITLE_PATTERNS,
  MAX_PER_CATEGORY_IN_RESULTS,
  MAX_PER_CATEGORY_POOL,
  MAX_PER_FEED,
  MAX_POOL_TOTAL,
  RANKING_SYSTEM_PROMPT,
  RANKINGS_TARGET_COUNT,
} from '../constants/dispatchRanking.js';
import DispatchArticle from '../models/dispatchArticle.model.js';
import TonkaDispatchRanking from '../models/tonkaDispatchRankings.model.js';
// Must be imported so Mongoose registers the schema for populate()
import '../models/tonkaDispatchRssLinks.model.js';
import { logger } from '../utils/logger.js';

import { emailService } from './email.service.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function dropPatternMatch(str, patterns) {
  if (!str) return false;
  for (const re of patterns) if (re.test(str)) return true;
  return false;
}

function getMs(article) {
  if (typeof article.published_at_ms === 'number')
    return article.published_at_ms;
  return 0;
}

function fmtDate(ms) {
  if (!ms || !Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Chicago',
    year: 'numeric',
  });
}

function buildEmailHtml({ batchId, rankings, today }) {
  const rows = rankings
    .map(r => {
      const a = r.article;
      const meta = [a.category, fmtDate(a.pub_date_ms)]
        .filter(Boolean)
        .join(' · ');
      return `
      <tr>
        <td style="padding:4px 8px;color:#888;font-size:12px;vertical-align:top;">${r.rank}</td>
        <td style="padding:4px 8px;vertical-align:top;">
          <a href="${a.link || '#'}" style="font-weight:600;color:#1a1a1a;text-decoration:none;">${a.title || a.canonical_id}</a>
          ${meta ? `<br><span style="font-size:12px;color:#666;">${meta}</span>` : ''}
          ${r.reason ? `<br><em style="font-size:12px;color:#888;">${r.reason}</em>` : ''}
          ${a.snippet ? `<br><span style="font-size:13px;color:#444;">${a.snippet.slice(0, 300)}${a.snippet.length > 300 ? '…' : ''}</span>` : ''}
        </td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#1a1a1a;">
  <h2 style="border-bottom:2px solid #e0e0e0;padding-bottom:8px;">Tonka Dispatch — ${today}</h2>
  <p style="font-size:13px;color:#666;">
    Top ${rankings.length} articles selected today. Batch: <code>${batchId}</code><br>
    <a href="https://social.tonkaintl.com/tonka-dispatch/rankings">Review all rankings →</a>
  </p>
  <table style="width:100%;border-collapse:collapse;">
    ${rows}
  </table>
</body>
</html>`;
}

// ── Retention cleanup (run before scheduled ranking) ────────────────────────

export async function runDispatchRetentionCleanup({
  dryRun = false,
  retentionDays = DISPATCH_BACKLOG_DAYS,
} = {}) {
  const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(cutoffMs);

  const oldArticleFilter = {
    published_at_ms: { $lt: cutoffMs },
  };

  // Rankings mainly use pub_date_ms. If missing, fall back to created_at.
  const oldRankingFilter = {
    $or: [
      { pub_date_ms: { $lt: cutoffMs } },
      {
        $and: [
          {
            $or: [{ pub_date_ms: { $exists: false } }, { pub_date_ms: null }],
          },
          { created_at: { $lt: cutoffDate } },
        ],
      },
    ],
  };

  const oldArticlesCount =
    await DispatchArticle.countDocuments(oldArticleFilter);
  const oldRankingsCount =
    await TonkaDispatchRanking.countDocuments(oldRankingFilter);

  logger.info('[DispatchRanking] Retention cleanup pre-check', {
    cutoff_iso: cutoffDate.toISOString(),
    dry_run: dryRun,
    old_dispatch_articles: oldArticlesCount,
    old_rankings: oldRankingsCount,
    retention_days: retentionDays,
  });

  if (dryRun) {
    return {
      cutoff_ms: cutoffMs,
      deleted_dispatch_articles: 0,
      deleted_rankings: 0,
      dry_run: true,
      retention_days: retentionDays,
      would_delete_dispatch_articles: oldArticlesCount,
      would_delete_rankings: oldRankingsCount,
    };
  }

  const articleResult = await DispatchArticle.deleteMany(oldArticleFilter);
  const rankingResult = await TonkaDispatchRanking.deleteMany(oldRankingFilter);

  logger.info('[DispatchRanking] Retention cleanup complete', {
    cutoff_iso: cutoffDate.toISOString(),
    deleted_dispatch_articles: articleResult.deletedCount,
    deleted_rankings: rankingResult.deletedCount,
    retention_days: retentionDays,
  });

  return {
    cutoff_ms: cutoffMs,
    deleted_dispatch_articles: articleResult.deletedCount || 0,
    deleted_rankings: rankingResult.deletedCount || 0,
    dry_run: false,
    retention_days: retentionDays,
  };
}

// ── Step 1: Fetch candidates from MongoDB ─────────────────────────────────────

async function fetchCandidates() {
  const cutoff = Date.now() - CANDIDATE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  const filter = {
    published_at_ms: { $gte: cutoff },
    'relevance.score': { $gte: CANDIDATE_SCORE_MIN },
  };

  if (CANDIDATE_EXCLUDE_USED) {
    const usedIds = await TonkaDispatchRanking.distinct('dispatch_article_id');
    const validIds = usedIds.filter(id => id !== null);
    if (validIds.length > 0) {
      filter._id = { $nin: validIds };
    }
  }

  const articles = await DispatchArticle.find(filter)
    .sort({ 'relevance.score': -1 })
    .populate('rss_link_id')
    .lean();

  logger.info('[DispatchRanking] Candidates fetched', {
    count: articles.length,
    score_min: CANDIDATE_SCORE_MIN,
  });

  return articles;
}

// ── Step 2: Pare the pool ─────────────────────────────────────────────────────

function parePool(articles) {
  // 2a. Drop low-value patterns
  let pool = articles.filter(a => {
    if (dropPatternMatch(a.title, DROP_TITLE_PATTERNS)) return false;
    if (dropPatternMatch(a.link, DROP_LINK_PATTERNS)) return false;
    if (!a.link) return false;
    return true;
  });

  // 2b. Cap per feed (by rss_link_id._id or rss_link_id string)
  const feedCounts = new Map();
  pool = pool.filter(a => {
    const feedKey =
      a.rss_link_id?._id?.toString() || a.rss_link_id?.toString() || '__none__';
    const n = feedCounts.get(feedKey) || 0;
    if (n >= MAX_PER_FEED) return false;
    feedCounts.set(feedKey, n + 1);
    return true;
  });

  // 2c. Cap per category in pool
  const catCounts = new Map();
  pool = pool.filter(a => {
    const cat = a.category || 'uncategorized';
    const n = catCounts.get(cat) || 0;
    if (n >= MAX_PER_CATEGORY_POOL) return false;
    catCounts.set(cat, n + 1);
    return true;
  });

  // 2d. Global cap — sort newest first, take top N
  pool = pool.sort((x, y) => getMs(y) - getMs(x)).slice(0, MAX_POOL_TOTAL);

  const catSummary = {};
  pool.forEach(a => {
    const c = a.category || 'uncategorized';
    catSummary[c] = (catSummary[c] || 0) + 1;
  });

  logger.info('[DispatchRanking] Pool after paring', {
    categories: catSummary,
    count: pool.length,
  });

  return pool;
}

// ── Step 3: Rank via Anthropic ────────────────────────────────────────────────

async function rankWithLLM(pool) {
  if (!config.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

  // Use simple numeric IDs to prevent LLM from hallucinating ObjectId strings.
  // Build a lookup map index → real article so we can map back after ranking.
  const indexMap = new Map(); // index (string) → article
  const items = pool.map((a, i) => {
    const idx = String(i + 1);
    indexMap.set(idx, a);
    return {
      category: a.category || null,
      id: idx,
      pub_date_ms: a.published_at_ms || null,
      score: a.relevance?.score ?? -1,
      snippet: (a.content_snippet || a.content || '').slice(0, 200),
      title: a.title,
    };
  });

  const userMessage = `Rank these ${items.length} articles for the Tonka Dispatch audience.

ITEMS:
${JSON.stringify(items, null, 2)}`;

  logger.info('[DispatchRanking] Calling Anthropic', {
    item_count: items.length,
    model: config.ANTHROPIC_MODEL,
  });

  const response = await client.messages.create({
    max_tokens: 8192,
    messages: [{ content: userMessage, role: 'user' }],
    model: config.ANTHROPIC_MODEL,
    system: RANKING_SYSTEM_PROMPT,
  });

  const raw = response.content?.[0]?.text || '';

  // Extract JSON object — strip markdown fences or any preamble/postamble text
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  const cleaned =
    firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
      ? raw.slice(firstBrace, lastBrace + 1)
      : raw
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```\s*$/i, '')
          .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    logger.error('[DispatchRanking] LLM returned unparseable JSON', {
      raw_preview: raw.slice(0, 500),
    });
    throw new Error('LLM response was not valid JSON');
  }

  logger.info('[DispatchRanking] LLM ranked', {
    selected_count: parsed.selected_article_ids?.length,
    total_ranked: parsed.rankings?.length,
  });

  // Translate numeric IDs back to real MongoDB ObjectId strings.
  // Any index the LLM invented that isn't in indexMap gets discarded here.
  const rankings = (parsed.rankings || [])
    .map(r => {
      const article = indexMap.get(String(r.article_id ?? r.id));
      if (!article) return null;
      return { ...r, article_id: article._id.toString() };
    })
    .filter(Boolean);

  return { ...parsed, rankings };
}

// ── Step 4: Enforce per-category cap on final results ─────────────────────────

function enforceResultCategoryCap(rankings, articleMap) {
  const catCounts = new Map();
  const capped = [];
  const dropped = [];

  for (const r of rankings) {
    const article = articleMap.get(r.article_id);
    const cat = article?.category || 'uncategorized';
    const n = catCounts.get(cat) || 0;
    if (n >= MAX_PER_CATEGORY_IN_RESULTS) {
      dropped.push({ ...r, category: cat, title: article?.title });
      continue;
    }
    catCounts.set(cat, n + 1);
    capped.push(r);
    if (capped.length >= RANKINGS_TARGET_COUNT) break;
  }

  const catSummary = {};
  capped.forEach(r => {
    const cat = articleMap.get(r.article_id)?.category || 'uncategorized';
    catSummary[cat] = (catSummary[cat] || 0) + 1;
  });

  if (dropped.length > 0) {
    logger.info('[DispatchRanking] Articles dropped by category cap', {
      dropped: dropped.map(d => ({
        category: d.category,
        rank: d.rank,
        title: d.title,
      })),
    });
  }

  logger.info('[DispatchRanking] Final rankings after category cap', {
    categories: catSummary,
    count: capped.length,
    max_per_category: MAX_PER_CATEGORY_IN_RESULTS,
  });

  return { capped, dropped };
}

// ── Step 5: Save to DB ────────────────────────────────────────────────────────

async function saveRankings(finalRankings, articleMap, batchId) {
  const saved = [];
  const errors = [];

  for (const r of finalRankings) {
    const article = articleMap.get(r.article_id);
    if (!article) {
      errors.push({
        article_id: r.article_id,
        error: 'article not found in map',
      });
      continue;
    }

    const feed = article.rss_link_id || {};

    try {
      const doc = await TonkaDispatchRanking.create({
        article_host: article.article_host || null,
        article_root_domain: article.article_root_domain || null,
        batch_id: batchId,
        canonical_id: article.link || null,
        category: article.category || null,
        creator: article.author || null,
        dispatch_article_id: article._id,
        feed_match_reason: 'embedded',
        feed_match_status: 'matched',
        link: article.link || null,
        match_method: 'embedded',
        pub_date_ms: article.published_at_ms || null,
        rank: r.rank,
        snippet: (article.content_snippet || '').slice(0, 500),
        source_name: feed.name || null,
        title: article.title || null,
        tonka_dispatch_rss_links_id: feed._id?.toString() || null,
      });
      saved.push(doc);
    } catch (err) {
      errors.push({
        article_id: r.article_id,
        error: err.message,
        rank: r.rank,
      });
    }
  }

  logger.info('[DispatchRanking] Saved to DB', {
    batch_id: batchId,
    errors: errors.length,
    saved: saved.length,
  });

  return { errors, saved };
}

// ── Step 6: Send email ────────────────────────────────────────────────────────

async function sendDigestEmail(finalRankings, articleMap, batchId) {
  const today = new Date().toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Chicago',
    weekday: 'short',
    year: 'numeric',
  });

  const subject = `Tonka Dispatch Dailies - ${today}`;

  // Build enriched ranking objects for the email template
  const enriched = finalRankings.map((r, i) => {
    const a = articleMap.get(r.article_id) || {};
    return {
      article: {
        category: a.category || null,
        link: a.link || null,
        pub_date_ms: a.published_at_ms || null,
        snippet: a.content_snippet || '',
        title: a.title || '',
      },
      rank: i + 1,
      reason: r.reason || '',
    };
  });

  const htmlBody = buildEmailHtml({ batchId, rankings: enriched, today });

  const recipients = config.TONKA_DISPATCH_RECIPIENTS.split(',').map(e =>
    e.trim()
  );

  try {
    await emailService.sendEmail({ htmlBody, subject, to: recipients });
    logger.info('[DispatchRanking] Digest email sent', { recipients, subject });
  } catch (err) {
    // Log but don't throw — DB save already succeeded
    logger.error('[DispatchRanking] Failed to send digest email', {
      error: err.message,
    });
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function runDailyRanking({ dryRun = false } = {}) {
  logger.info('[DispatchRanking] ── Starting daily ranking run ──');

  // 1. Fetch
  const candidates = await fetchCandidates();
  if (candidates.length === 0) {
    logger.warn('[DispatchRanking] No candidates found — skipping run', {
      exclude_used: CANDIDATE_EXCLUDE_USED,
      score_min: CANDIDATE_SCORE_MIN,
    });
    return { reason: 'no_candidates', skipped: true };
  }

  // 2. Pare
  const pool = parePool(candidates);
  if (pool.length === 0) {
    logger.warn('[DispatchRanking] Pool empty after paring — skipping run');
    return { reason: 'empty_pool', skipped: true };
  }

  // Build a lookup map for the rest of the pipeline
  const articleMap = new Map(pool.map(a => [a._id.toString(), a]));

  // 3. Rank
  const llmResult = await rankWithLLM(pool);
  const rawRankings = llmResult.rankings || [];

  // Discard any ranking the LLM returned with a hallucinated / unknown ID
  const validRankings = rawRankings.filter(r => {
    if (articleMap.has(r.article_id)) return true;
    logger.warn(
      '[DispatchRanking] LLM returned unknown article_id — discarding',
      {
        article_id: r.article_id,
        rank: r.rank,
      }
    );
    return false;
  });

  // 4. Category cap on results
  const { capped: cappedRankings, dropped: droppedByCap } =
    enforceResultCategoryCap(validRankings, articleMap);

  // Renumber ranks 1..N so gaps from dropped items don't appear in output/DB
  const finalRankings = cappedRankings.map((r, i) => ({ ...r, rank: i + 1 }));

  if (finalRankings.length === 0) {
    logger.warn(
      '[DispatchRanking] No rankings survived category cap — skipping DB write'
    );
    return { reason: 'no_rankings_after_cap', skipped: true };
  }

  // 5. Save
  const batchId = crypto.randomUUID();

  if (dryRun) {
    logger.info('[DispatchRanking] DRY RUN — skipping DB write and email');
    return {
      batch_id: batchId,
      dropped_by_cap: droppedByCap,
      dry_run: true,
      rankings: finalRankings.map(r => ({
        ...r,
        article_title: articleMap.get(r.article_id)?.title,
        category: articleMap.get(r.article_id)?.category,
      })),
      saved_count: 0,
      skipped: false,
    };
  }

  const { errors, saved } = await saveRankings(
    finalRankings,
    articleMap,
    batchId
  );

  // 6. Email
  await sendDigestEmail(finalRankings, articleMap, batchId);

  logger.info('[DispatchRanking] ── Run complete ──', {
    batch_id: batchId,
    errors: errors.length,
    saved: saved.length,
  });

  return {
    batch_id: batchId,
    errors,
    saved_count: saved.length,
    skipped: false,
  };
}
