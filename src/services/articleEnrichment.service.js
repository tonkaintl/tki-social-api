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
import { logger } from '../utils/logger.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 10_000;
const BODY_TEXT_MAX_CHARS = 4_000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; TonkaBot/1.0; +https://tonkaintl.com)';

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

  return (html.match(fwd) || html.match(rev))?.[1]?.trim() ?? null;
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
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.slice(0, BODY_TEXT_MAX_CHARS);
}

// ── Page Fetch ────────────────────────────────────────────────────────────────

export async function fetchPage(url) {
  const response = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT },
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

  try {
    const html = await fetchPage(link);
    ({ ogDescription, ogImage, ogTitle } = parsePageMetadata(html));
    const bodyText = extractBodyText(html);

    ({ model: summaryModel, summary } = await generateSummary({
      bodyText,
      ogDescription,
      title: ranking[RANKING_FIELDS.TITLE] || ogTitle,
    }));
  } catch (err) {
    logger.error('[ArticleEnrichment] Enrichment failed', {
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

  const updated = await TonkaDispatchRanking.findByIdAndUpdate(
    rankingId,
    {
      $unset: { [RANKING_FIELDS.AI_ENRICHMENT_ERROR]: '' },
      [RANKING_FIELDS.AI_ENRICHMENT_STATUS]: AI_ENRICHMENT_STATUS.SUCCESS,
      [RANKING_FIELDS.AI_SUMMARY]: summary,
      [RANKING_FIELDS.AI_SUMMARY_GENERATED_AT]: new Date(),
      [RANKING_FIELDS.AI_SUMMARY_MODEL]: summaryModel,
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
