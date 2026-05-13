# Tonka Dispatch — Daily Ranking Pipeline

Replaces the n8n workflow. Runs entirely in-process on this server.

---

## How It Works

### Step 0 — Upstream Article Collection (separate service)

**Service:** `tki-dispatch-collector` (separate Railway deployment, not this repo)  
**Schedule:** Mon–Fri ~1–4 AM CT  
**What it does:**

- Scrapes RSS feeds
- Deduplicates articles
- Scores each via Perplexity AI (`relevance.score`, 0–100)
- Writes scored articles to `dispatch_articles` (MongoDB, TKISOCIAL DB)
- Deletes articles older than **28 days** (collector-side shoulder; our pipeline only looks at 14 days)

### Step 1 — Candidate Fetch

Queries `dispatch_articles` for articles that:

- Have `relevance.score ≥ CANDIDATE_SCORE_MIN` (default **70**)
- Were published within the last `CANDIDATE_MAX_AGE_DAYS` (default **14** days)
- Have NOT already appeared in any previous ranking batch (controlled by `CANDIDATE_EXCLUDE_USED`)

### Step 2 — Pool Paring (~700 → 60)

Applied in order:

1. **Title pattern drops** — removes trivia, slideshows, podcasts, "top N" lists, awards, roundups (`DROP_TITLE_PATTERNS`)
2. **Link pattern drops** — removes media galleries, podcasts, slideshows, awards pages (`DROP_LINK_PATTERNS`)
3. **No-link drop** — articles without a URL are removed
4. **Per-feed cap** — max `MAX_PER_FEED` (default **5**) articles from any single RSS feed
5. **Per-category pool cap** — max `MAX_PER_CATEGORY_POOL` (default **8**) per category going into LLM
6. **Global cap** — sorted newest-first, top `MAX_POOL_TOTAL` (default **60**) sent to LLM

### Step 3 — LLM Ranking (Anthropic)

All 60 articles sent to `ANTHROPIC_MODEL` (default `claude-haiku-4-5`) with a system prompt that instructs it to:

- Rank all 60 exactly once, no omissions
- Reward variety across industries
- Return structured JSON (rank, article_id, score 0–100, reason 6–12 words)

Any article IDs the LLM returns that don't match the pool are silently discarded (hallucination guard).

### Step 4 — Category Cap on Results

After LLM ranking, a hard cap of `MAX_PER_CATEGORY_IN_RESULTS` (default **3**) per category is enforced on the final `RANKINGS_TARGET_COUNT` (default **10**) results. This is the primary fix for logistics dominance (historically 61% of all rankings). Results are renumbered 1–10.

### Step 5 — Save

Writes final 10 to `tonka_dispatch_rankings` collection with a `batch_id` (UUID), rank, category, title, link, feed info, etc.

### Step 6 — Email

Sends an HTML digest email to `TONKA_DISPATCH_RECIPIENTS` (env var, comma-separated).  
Default recipient: `stephen@tonkaintl.com`

---

## Cron Schedule

**`0 7 * * 1-5`** — 7:00 AM CT, Monday through Friday

Timezone: `America/Chicago`

The cron starts automatically when the server boots and the DB connection is established. An overlap guard (`isRunning` flag) prevents a second run from starting if the previous one is still in progress.

---

## Tunable Constants

All in **`src/constants/dispatchRanking.js`** — change here, redeploy, done.

| Constant                      | Default             | What it controls                                         |
| ----------------------------- | ------------------- | -------------------------------------------------------- |
| `CANDIDATE_SCORE_MIN`         | `70`                | Minimum Perplexity score for an article to be considered |
| `CANDIDATE_MAX_AGE_DAYS`      | `14`                | How many days back to look for articles                  |
| `CANDIDATE_EXCLUDE_USED`      | `true`              | Skip articles already in any previous batch              |
| `MAX_PER_FEED`                | `5`                 | Max articles from a single RSS feed in the LLM pool      |
| `MAX_PER_CATEGORY_POOL`       | `8`                 | Max articles per category sent to the LLM                |
| `MAX_POOL_TOTAL`              | `60`                | Total articles sent to the LLM                           |
| `MAX_PER_CATEGORY_IN_RESULTS` | `3`                 | Max articles from one category in the final 10           |
| `RANKINGS_TARGET_COUNT`       | `10`                | How many articles to select per day                      |
| `RANKING_CRON_SCHEDULE`       | `'0 7 * * 1-5'`     | node-cron schedule string                                |
| `RANKING_CRON_TIMEZONE`       | `'America/Chicago'` | Timezone for the cron                                    |
| `RANKING_SYSTEM_PROMPT`       | (full text)         | Instructions sent to Anthropic                           |
| `DROP_TITLE_PATTERNS`         | (array of regex)    | Title patterns that disqualify an article                |
| `DROP_LINK_PATTERNS`          | (array of regex)    | URL patterns that disqualify an article                  |

---

## Env Vars Required on Railway

| Var                         | Notes                                                          |
| --------------------------- | -------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`         | Required. Pipeline throws if missing.                          |
| `ANTHROPIC_MODEL`           | Default: `claude-haiku-4-5`                                    |
| `TONKA_DISPATCH_RECIPIENTS` | Default: `stephen@tonkaintl.com`. Comma-separate for multiple. |
| `MONGODB_TKISOCIAL_URI`     | Already set. Required for everything.                          |

---

## Key Files

| File                                      | Purpose                                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/constants/dispatchRanking.js`        | All tunable constants — the only file you need to edit to change pipeline behavior                         |
| `src/services/dispatchRanking.service.js` | Full pipeline logic — fetch, pare, rank, cap, save, email                                                  |
| `src/services/dispatchRanking.cron.js`    | Cron scheduler — starts after DB connect in `server.js`                                                    |
| `scripts/analyze-dispatch-db.js`          | Standalone DB snapshot — run anytime to see score distribution, candidate pool by category, recent batches |
| `scripts/test-dispatch-ranking.js`        | Manual pipeline test runner — `--live` flag to actually write DB + send email                              |

---

## Running Manually

```bash
# Dry run — calls LLM, prints results, NO DB write, NO email
node scripts/test-dispatch-ranking.js

# Live run — writes to DB and sends email
node scripts/test-dispatch-ranking.js --live

# DB snapshot
node scripts/analyze-dispatch-db.js
```

---

## DB Notes (as of May 2026)

- Total articles: ~5,967 (all scored)
- Candidate pool at score ≥ 70, last 14 days: ~700
- Logistics dominates raw candidates (37.8%) but is capped at 3 of 10 in final results
- Score range in practice: 70–94 (no articles scoring ≥ 95 currently)
- `medical` and `forestry` categories have articles in DB but rarely score ≥ 70 in recent window
