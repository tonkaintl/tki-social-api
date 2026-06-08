// ----------------------------------------------------------------------------
// Dispatch Daily Ranking Service
//
// Design (rewritten): "select → sample by category → score a budget → pick".
// We never score the whole ingest firehose. Each run we:
//   1. select RECENT articles (published within the candidate window, not used),
//   2. apply free (regex) filters,
//   3. take the N newest per category as a bounded scoring shortlist,
//   4. score only the unscored shortlist items via Anthropic and PERSIST scores,
//   5. pick the top MAX_PER_CATEGORY_IN_RESULTS per category by score (>= floor),
//      with NO global count cap,
//   6. save + email.
//
// This bounds daily LLM cost to ~(categories × SCORE_PER_CATEGORY), can never
// build a backlog, and never pays to score articles that get tossed unused.
// runDailyRanking accepts an `asOf` timestamp so the same logic backfills any
// historical day (see scripts/backfill-rankings.mjs).
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
  MAX_PER_FEED,
  RELEVANCE_SCORER_PROMPT,
  SCORE_PER_CATEGORY,
} from '../constants/dispatchRanking.js';
import DispatchArticle from '../models/dispatchArticle.model.js';
import TonkaDispatchNewsletter from '../models/tonkaDispatchNewsletters.model.js';
import TonkaDispatchRanking from '../models/tonkaDispatchRankings.model.js';
// Must be imported so Mongoose registers the schema for populate()
import '../models/tonkaDispatchRssLinks.model.js';
import { logger } from '../utils/logger.js';

import { emailService } from './email.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// How many shortlist articles to score concurrently. Anthropic Haiku handles
// this comfortably; keeps a ~100-article run to well under a minute.
const SCORE_CONCURRENCY = 6;

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

function scoreOf(article) {
  const s = article.relevance?.score;
  return typeof s === 'number' ? s : -1;
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
    ${rankings.length} articles selected today. Batch: <code>${batchId}</code><br>
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

  // Before deleting rankings, check if any are referenced in newsletters
  const rankingsToDelete =
    await TonkaDispatchRanking.find(oldRankingFilter).select('_id');
  const rankingIdsToDelete = rankingsToDelete.map(r => r._id);

  const referencedInNewsletters = await TonkaDispatchNewsletter.find({
    'articles.tonka_dispatch_rankings_id': { $in: rankingIdsToDelete },
  }).select('articles.tonka_dispatch_rankings_id');

  // Extract ranking IDs that are referenced in newsletters
  const referencedRankingIds = new Set();
  referencedInNewsletters.forEach(newsletter => {
    newsletter.articles.forEach(article => {
      if (article.tonka_dispatch_rankings_id) {
        referencedRankingIds.add(article.tonka_dispatch_rankings_id.toString());
      }
    });
  });

  // Only delete rankings that are NOT referenced in newsletters
  const safeRankingFilter = {
    ...oldRankingFilter,
    _id: { $nin: Array.from(referencedRankingIds) },
  };

  const articleResult = await DispatchArticle.deleteMany(oldArticleFilter);
  const rankingResult =
    await TonkaDispatchRanking.deleteMany(safeRankingFilter);

  const protectedRankingsCount = referencedRankingIds.size;
  if (protectedRankingsCount > 0) {
    logger.info(
      '[DispatchRanking] Protected rankings from deletion (referenced in newsletters)',
      {
        protected_rankings: protectedRankingsCount,
      }
    );
  }

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

// ── Step 1: Select recent, category-balanced shortlist (no LLM cost) ──────────

async function selectShortlist(asOf) {
  const cutoff = asOf - CANDIDATE_MAX_AGE_DAYS * DAY_MS;

  // Recent by publish date, up to the as-of moment (so backfilling a past day
  // never "sees" articles published after that day).
  const filter = { published_at_ms: { $gte: cutoff, $lte: asOf } };

  if (CANDIDATE_EXCLUDE_USED) {
    // Exclude by BOTH article id and link. The same story is frequently
    // ingested as several dispatch_articles docs (syndicated across feeds with
    // different guids), so excluding only by _id would let the same link reappear
    // in a later batch. canonical_id on a ranking == the article link.
    const [usedIds, usedLinks] = await Promise.all([
      TonkaDispatchRanking.distinct('dispatch_article_id'),
      TonkaDispatchRanking.distinct('canonical_id'),
    ]);
    const ids = usedIds.filter(Boolean);
    const links = usedLinks.filter(Boolean);
    if (ids.length > 0) filter._id = { $nin: ids };
    if (links.length > 0) filter.link = { $nin: links };
  }

  const articles = await DispatchArticle.find(filter)
    .populate('rss_link_id')
    .lean();

  // Free pre-filters — drop low-value patterns and link-less items. $0 cost.
  const prefiltered = articles.filter(a => {
    if (!a.link) return false;
    if (dropPatternMatch(a.title, DROP_TITLE_PATTERNS)) return false;
    if (dropPatternMatch(a.link, DROP_LINK_PATTERNS)) return false;
    return true;
  });

  // Dedupe by link WITHIN this run — keep one doc per story. Prefer a copy that
  // is already scored (reuse the cache), then the newest.
  const byLink = new Map();
  for (const a of prefiltered) {
    const existing = byLink.get(a.link);
    if (!existing) {
      byLink.set(a.link, a);
      continue;
    }
    const better =
      (scoreOf(a) >= 0 ? 1 : 0) - (scoreOf(existing) >= 0 ? 1 : 0) ||
      getMs(a) - getMs(existing);
    if (better > 0) byLink.set(a.link, a);
  }
  const filtered = [...byLink.values()];

  // Group by category.
  const byCat = new Map();
  for (const a of filtered) {
    const cat = a.category || 'uncategorized';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(a);
  }

  // Per category: newest-first, per-feed cap, take SCORE_PER_CATEGORY.
  const shortlist = [];
  const catSummary = {};
  for (const [cat, list] of byCat) {
    list.sort((x, y) => getMs(y) - getMs(x));
    const feedCounts = new Map();
    const picked = [];
    for (const a of list) {
      const feedKey =
        a.rss_link_id?._id?.toString() ||
        a.rss_link_id?.toString() ||
        '__none__';
      const n = feedCounts.get(feedKey) || 0;
      if (n >= MAX_PER_FEED) continue;
      feedCounts.set(feedKey, n + 1);
      picked.push(a);
      if (picked.length >= SCORE_PER_CATEGORY) break;
    }
    shortlist.push(...picked);
    catSummary[cat] = picked.length;
  }

  logger.info('[DispatchRanking] Shortlist built', {
    candidates: filtered.length,
    categories: catSummary,
    per_category: SCORE_PER_CATEGORY,
    shortlist: shortlist.length,
  });

  return shortlist;
}

// ── Step 2: Score the shortlist via Anthropic and persist scores ──────────────

async function scoreOne(client, article) {
  const snippet = article.content_snippet || article.content || '';
  const newsStory = `Title: ${article.title}\n\nSnippet: ${snippet || 'N/A'}`;

  const resp = await client.messages.create({
    max_tokens: 10,
    messages: [{ content: `News story:\n${newsStory}`, role: 'user' }],
    model: config.ANTHROPIC_MODEL,
    system: RELEVANCE_SCORER_PROMPT,
  });

  const txt = resp.content?.[0]?.text?.trim();
  const score = parseInt(txt, 10);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error(`invalid score "${txt}"`);
  }
  return { score, usage: resp.usage || {} };
}

async function scoreAndPersist(articles) {
  if (!config.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const queue = [...articles];
  let scored = 0;
  let failed = 0;

  async function worker() {
    while (queue.length > 0) {
      const a = queue.pop();
      try {
        const { score, usage } = await scoreOne(client, a);
        await DispatchArticle.updateOne(
          { _id: a._id },
          { $set: { relevance: { score, usage } } }
        );
        // Mutate the in-memory object so the selection step sees the score.
        a.relevance = { ...(a.relevance || {}), score, usage };
        scored++;
      } catch (err) {
        failed++;
        logger.warn('[DispatchRanking] Scoring failed for article', {
          error: err.message,
          id: a._id?.toString(),
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(SCORE_CONCURRENCY, articles.length) }, worker)
  );

  logger.info('[DispatchRanking] Scoring complete', {
    failed,
    requested: articles.length,
    scored,
  });
  return { failed, scored };
}

// ── Step 3: Pick top-N per category by score (>= floor), no global cap ────────

function pickResults(shortlist) {
  const byCat = new Map();
  for (const a of shortlist) {
    if (scoreOf(a) < CANDIDATE_SCORE_MIN) continue; // quality floor
    const cat = a.category || 'uncategorized';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(a);
  }

  const selected = [];
  for (const [, list] of byCat) {
    list.sort((x, y) => scoreOf(y) - scoreOf(x));
    selected.push(...list.slice(0, MAX_PER_CATEGORY_IN_RESULTS));
  }

  // Present best-first across the whole digest.
  selected.sort((x, y) => scoreOf(y) - scoreOf(x));
  return selected;
}

// ── Step 4: Save to DB ────────────────────────────────────────────────────────

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
        used_in_newsletter_id: null,
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

// ── Step 5: Send email ────────────────────────────────────────────────────────

async function sendDigestEmail(finalRankings, articleMap, batchId, asOf) {
  const today = new Date(asOf).toLocaleDateString('en-US', {
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

/**
 * Run the dispatch ranking for a given day.
 *
 * @param {object}  [opts]
 * @param {number}  [opts.asOf=Date.now()]  As-of timestamp (ms). Drives the
 *   recency window and lets the same logic backfill any historical day.
 * @param {string}  [opts.batchId]          Override the batch id (backfill uses
 *   a date-stamped id; live runs default to a UUID).
 * @param {boolean} [opts.dryRun=false]     Score + select but skip DB + email.
 * @param {boolean} [opts.sendEmail=true]   Send the digest email after saving.
 */
export async function runDailyRanking({
  asOf = Date.now(),
  batchId = null,
  dryRun = false,
  sendEmail = true,
} = {}) {
  logger.info('[DispatchRanking] ── Starting daily ranking run ──', {
    as_of: new Date(asOf).toISOString(),
    dry_run: dryRun,
  });

  // 1. Select recent, category-balanced shortlist (free filters, no LLM yet).
  const shortlist = await selectShortlist(asOf);
  if (shortlist.length === 0) {
    logger.warn('[DispatchRanking] No recent articles to consider — skipping', {
      max_age_days: CANDIDATE_MAX_AGE_DAYS,
    });
    return { reason: 'no_candidates', skipped: true };
  }

  // 2. Score only the unscored shortlist items (bounded + cached).
  const toScore = shortlist.filter(a => scoreOf(a) < 0);
  logger.info('[DispatchRanking] Scoring shortlist', {
    already_scored: shortlist.length - toScore.length,
    to_score: toScore.length,
    total: shortlist.length,
  });
  if (toScore.length > 0) await scoreAndPersist(toScore);

  // 3. Pick top-N per category by score (>= floor), no global cap.
  const selected = pickResults(shortlist);
  if (selected.length === 0) {
    logger.warn('[DispatchRanking] Nothing met the score floor — skipping', {
      score_min: CANDIDATE_SCORE_MIN,
    });
    return { reason: 'no_rankings', skipped: true };
  }

  const finalRankings = selected.map((a, i) => ({
    article_id: a._id.toString(),
    rank: i + 1,
    reason: '',
    score: scoreOf(a),
  }));
  const articleMap = new Map(selected.map(a => [a._id.toString(), a]));

  const catSummary = {};
  selected.forEach(a => {
    const c = a.category || 'uncategorized';
    catSummary[c] = (catSummary[c] || 0) + 1;
  });
  logger.info('[DispatchRanking] Selected', {
    categories: catSummary,
    count: selected.length,
    per_category: MAX_PER_CATEGORY_IN_RESULTS,
  });

  // 4. Dry run — report and stop.
  if (dryRun) {
    logger.info('[DispatchRanking] DRY RUN — skipping DB write and email');
    return {
      as_of: new Date(asOf).toISOString(),
      categories: catSummary,
      dry_run: true,
      rankings: finalRankings.map(r => ({
        ...r,
        category: articleMap.get(r.article_id)?.category,
        title: articleMap.get(r.article_id)?.title,
      })),
      saved_count: 0,
      skipped: false,
    };
  }

  // 5. Save.
  const id = batchId || crypto.randomUUID();
  const { errors, saved } = await saveRankings(finalRankings, articleMap, id);

  // 6. Email (optional — backfill of past days runs with sendEmail=false).
  if (sendEmail) await sendDigestEmail(finalRankings, articleMap, id, asOf);

  logger.info('[DispatchRanking] ── Run complete ──', {
    batch_id: id,
    errors: errors.length,
    saved: saved.length,
  });

  return {
    batch_id: id,
    errors,
    saved_count: saved.length,
    skipped: false,
  };
}
