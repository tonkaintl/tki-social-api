// ----------------------------------------------------------------------------
// Dispatch Daily Ranking — tunable constants
// Numeric/boolean knobs are driven by DISPATCH_* env vars (set on Railway).
// Defaults here are the fallback values when the env var is not set.
// Regex patterns and the LLM prompt stay hardcoded — not env-drivable.
// ----------------------------------------------------------------------------

import { config } from '../config/env.js';

// ── Article candidate pool ───────────────────────────────────────────────────

// Minimum Perplexity relevance score to even be considered
// Env: DISPATCH_CANDIDATE_SCORE_MIN (default 70)
export const CANDIDATE_SCORE_MIN = config.DISPATCH_CANDIDATE_SCORE_MIN;

// Only look at articles published within this many days.
// 5 days covers the weekend gap — Monday's run picks up Thu/Fri/Sat/Sun/Mon articles.
// Env: DISPATCH_CANDIDATE_MAX_AGE_DAYS (default 3)
export const CANDIDATE_MAX_AGE_DAYS = config.DISPATCH_CANDIDATE_MAX_AGE_DAYS;

// Exclude articles that already appear in any rankings batch
// Env: DISPATCH_CANDIDATE_EXCLUDE_USED (default true)
export const CANDIDATE_EXCLUDE_USED = config.DISPATCH_CANDIDATE_EXCLUDE_USED;

// Purge records older than this many days before each scheduled run.
// Env: DISPATCH_BACKLOG_DAYS (default 28)
export const DISPATCH_BACKLOG_DAYS = config.DISPATCH_BACKLOG_DAYS;

// ── Pare: drop low-value patterns ───────────────────────────────────────────

export const DROP_TITLE_PATTERNS = [
  /\btrivia\b/i,
  /\bslideshow\b/i,
  /\bpodcast\b/i,
  /\btop\s+\d+\b/i,
  /\btop\s+(stories|podcasts|roads|bridges|video interviews|cover stories)\b/i,
  /\bawards\b/i,
  /\broundup\b/i,
];

export const DROP_LINK_PATTERNS = [
  /\bmedia-gallery\b/i,
  /\bpodcast\b/i,
  /\bslideshow\b/i,
  /\bawards\b/i,
];

// ── Pare: per-feed cap ───────────────────────────────────────────────────────

// Max articles from any single RSS feed going into the LLM pool
// Env: DISPATCH_MAX_PER_FEED (default 5)
export const MAX_PER_FEED = config.DISPATCH_MAX_PER_FEED;

// ── Pare: per-category cap ───────────────────────────────────────────────────

// Hard cap: no single category may supply more than this many slots in the
// final ranked output. This is the primary fix for logistics dominance.
// Env: DISPATCH_MAX_PER_CATEGORY_IN_RESULTS (default 3)
export const MAX_PER_CATEGORY_IN_RESULTS =
  config.DISPATCH_MAX_PER_CATEGORY_IN_RESULTS;

// Max articles per category sent to the LLM (pre-ranking pool cap).
// Keep this high enough to give the LLM choice within each category.
// Env: DISPATCH_MAX_PER_CATEGORY_POOL (default 8)
export const MAX_PER_CATEGORY_POOL = config.DISPATCH_MAX_PER_CATEGORY_POOL;

// ── Pare: global pool cap (sent to LLM) ─────────────────────────────────────

// Env: DISPATCH_MAX_POOL_TOTAL (default 60)
export const MAX_POOL_TOTAL = config.DISPATCH_MAX_POOL_TOTAL;

// ── LLM output ───────────────────────────────────────────────────────────────

// How many articles the LLM should select as "top" picks
// Env: DISPATCH_RANKINGS_TARGET_COUNT (default 10)
export const RANKINGS_TARGET_COUNT = config.DISPATCH_RANKINGS_TARGET_COUNT;

// ── Cron schedule ───────────────────────────────────────────────────────────
// node-cron format: second(opt) minute hour day-of-month month day-of-week
// Default: 7:00 AM CT Monday–Friday
export const RANKING_CRON_SCHEDULE = '0 7 * * 1-5';
export const RANKING_CRON_TIMEZONE = 'America/Chicago';

// ── LLM prompt ───────────────────────────────────────────────────────────────

export const RANKING_SYSTEM_PROMPT = `You are a ranking engine for a daily trucking, heavy equipment, and industrial newsletter called Tonka Dispatch.

Your audience is trucking/logistics professionals, but the newsletter covers a broad mix of industries including:
agriculture, oil-and-gas, marine, construction, power, manufacturing, mining, and civil infrastructure.

Return ONLY valid JSON. No commentary. No markdown fences. No extra keys.

Rules:
1. Rank ALL provided items exactly once — no duplicates, no omissions.
2. Sort by rank ascending (rank 1 = best fit for the audience today).
3. selected_ids = the first ${RANKINGS_TARGET_COUNT} id values from rankings, in order.
4. score = integer 0–100 for relevance and newsworthiness to this audience.
5. reason = 6–12 words, letters/numbers/spaces only, no trailing punctuation.
6. Actively reward variety — a mix of industries is better than 10 logistics stories.
7. Do not add information not present in the provided data.
8. Each item has a numeric "id" field — use ONLY those exact numbers, do not invent new ones.

Required output shape:
{
  "rankings": [
    {
      "rank": 1,
      "article_id": <number>,
      "score": <0-100>,
      "reason": "<6-12 word reason>"
    }
  ],
  "selected_ids": [<number>, ...]
}`;
