// ----------------------------------------------------------------------------
// Article Enrichment Service
// Fetches an article URL, extracts OG/JSON-LD metadata, then uses Claude to
// generate a ≤3 sentence summary.  Saves results back to the ranking document.
// ----------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

import { config } from '../config/env.js';
import {
  AI_ENRICHMENT_STATUS,
  RANKING_FIELDS,
} from '../constants/tonkaDispatch.js';
import TonkaDispatchRanking from '../models/tonkaDispatchRankings.model.js';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities.js';
import { logger } from '../utils/logger.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 10_000;
const BODY_TEXT_MAX_CHARS = 4_000;
// Many publisher sites (Cloudflare/WAF) reject anything with "bot" in the UA
// with a 403 before we ever see the page. Use a standard Chrome UA to pass
// those checks; if it still gets blocked, we fall back to the RSS snippet.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ── HTML Helpers ──────────────────────────────────────────────────────────────

/**
 * Extract a single <meta> tag content, supporting both attribute orderings.
 * property/name can come before or after content.
 */
function extractMeta(html, attrName, attrValue) {
  const escaped = attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // attr="value" ... content="..."
  const fwd = new RegExp(
    `<meta[^>]+${attrName}=["']${escaped}["'][^>]+content=["']([^"'<>]+)["']`,
    'i'
  );
  // content="..." ... attr="value"
  const rev = new RegExp(
    `<meta[^>]+content=["']([^"'<>]+)["'][^>]+${attrName}=["']${escaped}["']`,
    'i'
  );

  const raw = (html.match(fwd) || html.match(rev))?.[1]?.trim() ?? null;

  // Meta content is HTML-entity-encoded in source markup (e.g.
  // content="Caterpillar&#39;s Q3 &amp; earnings"). Decode so og_title /
  // og_description are stored as plain text, matching extractBodyText below.
  return raw === null ? null : decodeHtmlEntities(raw);
}

/**
 * Parse OG tags and JSON-LD from raw HTML, returning image + description.
 */
export function parsePageMetadata(html) {
  const ogImage =
    extractMeta(html, 'property', 'og:image') ||
    extractMeta(html, 'name', 'twitter:image') ||
    extractMeta(html, 'name', 'twitter:image:src');

  const ogDescription =
    extractMeta(html, 'property', 'og:description') ||
    extractMeta(html, 'name', 'description');

  const ogTitle = extractMeta(html, 'property', 'og:title');

  // Try JSON-LD for image if OG missed it
  let jsonLdImage = null;
  const ldMatch = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (ldMatch) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      const items = Array.isArray(ld) ? ld : [ld];
      for (const item of items) {
        const img = item.image;
        if (!img) continue;
        if (typeof img === 'string') {
          jsonLdImage = img;
        } else if (Array.isArray(img) && typeof img[0] === 'string') {
          jsonLdImage = img[0];
        } else if (img.url) {
          jsonLdImage = img.url;
        }
        if (jsonLdImage) break;
      }
    } catch {
      // Malformed JSON-LD — silently ignore
    }
  }

  return {
    ogDescription,
    ogImage: ogImage || jsonLdImage,
    ogTitle,
  };
}

/**
 * Strip HTML tags and collapse whitespace to extract readable body text.
 * Removes script/style/nav/header/footer blocks first.
 */
export function extractBodyText(html) {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ');

  const cleaned = decodeHtmlEntities(stripped)
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.slice(0, BODY_TEXT_MAX_CHARS);
}

// ── Page Fetch ────────────────────────────────────────────────────────────────

export async function fetchPage(url) {
  const response = await axios.get(url, {
    headers: {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': USER_AGENT,
    },
    maxRedirects: 5,
    timeout: FETCH_TIMEOUT_MS,
    // Only accept HTML — avoid downloading large binaries
    validateStatus: status => status < 400,
  });

  const contentType = response.headers['content-type'] || '';
  if (!contentType.includes('text/html')) {
    throw new Error(`Non-HTML content-type: ${contentType}`);
  }

  return String(response.data);
}

// ── AI Summary ────────────────────────────────────────────────────────────────

export async function generateSummary({ bodyText, ogDescription, title }) {
  if (!config.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const model = config.ANTHROPIC_MODEL || 'claude-haiku-4-5';

  const contextParts = [];
  if (title) contextParts.push(`Title: ${title}`);
  if (ogDescription) contextParts.push(`Description: ${ogDescription}`);
  if (bodyText) contextParts.push(`Article content:\n${bodyText}`);

  const userMessage = `${contextParts.join('\n\n')}

Write a summary of this article in 3 sentences or fewer. Be factual and concise. Do not use phrases like "This article" or "The author". Return only the summary text, no preamble.`;

  const message = await client.messages.create({
    max_tokens: 256,
    messages: [{ content: userMessage, role: 'user' }],
    model,
    system:
      'You are a concise editorial assistant. Summarize articles accurately and objectively for a professional trade industry audience.',
  });

  const summary = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim();

  return { model, summary };
}

// ── Core Enrichment ───────────────────────────────────────────────────────────

/**
 * Enrich a single ranking document with AI summary and OG image.
 * @param {object} ranking  Mongoose document
 * @param {boolean} refresh Overwrite existing enrichment if true
 * @returns {object} Updated ranking plain object
 */
export async function enrichRanking(ranking, refresh = false) {
  const rankingId = ranking._id.toString();

  // Skip if already done and refresh not requested
  if (
    !refresh &&
    ranking[RANKING_FIELDS.AI_ENRICHMENT_STATUS] ===
      AI_ENRICHMENT_STATUS.SUCCESS
  ) {
    logger.info('[ArticleEnrichment] Skipping — already enriched', {
      rankingId,
    });
    return ranking.toObject();
  }

  const link = ranking[RANKING_FIELDS.LINK];
  if (!link) {
    await TonkaDispatchRanking.findByIdAndUpdate(rankingId, {
      [RANKING_FIELDS.AI_ENRICHMENT_ERROR]: 'No article link on ranking',
      [RANKING_FIELDS.AI_ENRICHMENT_STATUS]: AI_ENRICHMENT_STATUS.FAILED,
    });
    throw new Error('Ranking has no link');
  }

  logger.info('[ArticleEnrichment] Enriching ranking', { link, rankingId });

  let ogImage = null;
  let ogDescription = null;
  let ogTitle = null;
  let summary = null;
  let summaryModel = null;
  let fetchError = null;
  let bodyText = null;

  // Step 1: try to fetch the article page. If the publisher blocks us
  // (403/Cloudflare/WAF) or the request fails, we'll fall back to the RSS
  // snippet that's already on the ranking — partial enrichment is better
  // than a hard failure.
  try {
    const html = await fetchPage(link);
    ({ ogDescription, ogImage, ogTitle } = parsePageMetadata(html));
    bodyText = extractBodyText(html);
  } catch (err) {
    fetchError = err;
    logger.warn(
      '[ArticleEnrichment] Page fetch failed — falling back to snippet',
      {
        error: err.message,
        link,
        rankingId,
        status: err.response?.status,
      }
    );
  }

  // Step 2: generate summary from whatever content we have. Prefer scraped
  // body text; otherwise fall back to the RSS snippet on the ranking.
  const snippet = ranking[RANKING_FIELDS.SNIPPET];
  const summaryInput = bodyText || snippet;

  if (!summaryInput) {
    // Truly nothing to summarize — neither page fetch nor snippet usable.
    const message = fetchError
      ? `Article fetch failed (${fetchError.response?.status || 'network'}) and no snippet available`
      : 'No content available to summarize';

    await TonkaDispatchRanking.findByIdAndUpdate(rankingId, {
      [RANKING_FIELDS.AI_ENRICHMENT_ERROR]: message,
      [RANKING_FIELDS.AI_ENRICHMENT_STATUS]: AI_ENRICHMENT_STATUS.FAILED,
    });

    const err = new Error(message);
    err.cause = fetchError;
    throw err;
  }

  try {
    ({ model: summaryModel, summary } = await generateSummary({
      bodyText: summaryInput,
      ogDescription: ogDescription || snippet,
      title: ranking[RANKING_FIELDS.TITLE] || ogTitle,
    }));
  } catch (err) {
    logger.error('[ArticleEnrichment] Summary generation failed', {
      error: err.message,
      link,
      rankingId,
    });

    await TonkaDispatchRanking.findByIdAndUpdate(rankingId, {
      [RANKING_FIELDS.AI_ENRICHMENT_ERROR]: err.message,
      [RANKING_FIELDS.AI_ENRICHMENT_STATUS]: AI_ENRICHMENT_STATUS.FAILED,
    });

    throw err;
  }

  // Record fetch failure as a non-fatal warning on the ranking so the UI can
  // surface "summary from RSS snippet (article page blocked)" if it wants to.
  const enrichmentNote = fetchError
    ? `Page fetch blocked (${fetchError.response?.status || 'network error'}); summary generated from RSS snippet`
    : null;

  const updated = await TonkaDispatchRanking.findByIdAndUpdate(
    rankingId,
    {
      [RANKING_FIELDS.AI_ENRICHMENT_STATUS]: AI_ENRICHMENT_STATUS.SUCCESS,
      [RANKING_FIELDS.AI_SUMMARY]: summary,
      [RANKING_FIELDS.AI_SUMMARY_GENERATED_AT]: new Date(),
      [RANKING_FIELDS.AI_SUMMARY_MODEL]: summaryModel,
      ...(enrichmentNote
        ? { [RANKING_FIELDS.AI_ENRICHMENT_ERROR]: enrichmentNote }
        : { $unset: { [RANKING_FIELDS.AI_ENRICHMENT_ERROR]: '' } }),
      ...(ogDescription && { [RANKING_FIELDS.OG_DESCRIPTION]: ogDescription }),
      ...(ogImage && { [RANKING_FIELDS.OG_IMAGE_URL]: ogImage }),
      ...(ogTitle && { [RANKING_FIELDS.OG_TITLE]: ogTitle }),
    },
    { new: true }
  );

  logger.info('[ArticleEnrichment] Ranking enriched successfully', {
    hasImage: !!ogImage,
    rankingId,
    summaryModel,
  });

  return updated.toObject();
}
