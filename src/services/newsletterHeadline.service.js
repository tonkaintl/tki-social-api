// ----------------------------------------------------------------------------
// Newsletter Headline Service
// Generates the reader-facing Beehiiv title / subtitle for a dispatch
// newsletter from its own article set (and lead spark, if present). Returns
// freshly generated copy; persistence is the caller's job (the frontend saves
// the chosen values via PATCH — generation must not overwrite as a side effect).
// ----------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';

import { config } from '../config/env.js';
import { sanitizeText } from '../utils/sanitizeControlChars.js';

// Keep the prompt bounded on large newsletters; the top articles carry the
// theme. Snippet length is trimmed per-article so context stays compact.
const MAX_ARTICLES = 12;
const SNIPPET_MAX_CHARS = 240;

// Soft targets handed to the model. Beehiiv shows a short headline and a
// one-line deck; we ask for concise copy rather than hard-truncating output.
const TITLE_MAX_CHARS = 60;
const SUBTITLE_MAX_CHARS = 120;

const SYSTEM_PROMPT =
  'You are an editorial assistant writing headlines for the Tonka Dispatch, a ' +
  'daily B2B newsletter covering the heavy equipment, trucking, crane, marine, ' +
  'mining, and industrial trades. Write punchy, factual, professional copy for ' +
  'a trade audience. No clickbait, no emoji, no hype, no hashtags.';

// ── Context building ────────────────────────────────────────────────────────

function stripTags(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Resolve each article the same way the UI does (custom_* override first, then
// the populated ranking) and render a compact, ordered brief for the model.
function buildArticleBrief(newsletter) {
  const articles = [...(newsletter.articles || [])]
    .sort((a, b) => (a.custom_order ?? 0) - (b.custom_order ?? 0))
    .slice(0, MAX_ARTICLES);

  const lines = [];
  articles.forEach((article, idx) => {
    const ranking = article.tonka_dispatch_rankings_id || {};
    const title =
      article.custom_title || ranking.og_title || ranking.title || '';
    const snippet = stripTags(
      article.custom_snippet ||
        ranking.ai_summary ||
        ranking.snippet ||
        ranking.og_description ||
        ''
    ).slice(0, SNIPPET_MAX_CHARS);
    const category = article.custom_category || ranking.category || '';

    if (!title && !snippet) return;

    const header = category
      ? `${idx + 1}. ${title} [${category}]`
      : `${idx + 1}. ${title}`;
    lines.push(header.trim());
    if (snippet) lines.push(`   ${snippet}`);
  });

  return lines.join('\n');
}

// ── Output parsing ──────────────────────────────────────────────────────────

// Pull a JSON object out of the model's reply, tolerating code fences or stray
// prose around it. Returns {} if nothing parseable is found.
function extractJson(text) {
  if (typeof text !== 'string') return {};
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return {};
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return {};
  }
}

// Clean a single generated string: sanitize control-char garbage, drop wrapping
// quotes the model sometimes adds, and collapse whitespace.
function cleanLine(value) {
  if (typeof value !== 'string') return '';
  let out = sanitizeText(value).trim();
  if (
    out.length >= 2 &&
    ((out.startsWith('"') && out.endsWith('"')) ||
      (out.startsWith("'") && out.endsWith("'")))
  ) {
    out = out.slice(1, -1).trim();
  }
  return out.replace(/\s+/g, ' ');
}

// ── Generation ──────────────────────────────────────────────────────────────

// mode: 'title' | 'subtitle' | 'both'. Returns only the requested keys, e.g.
// { beehiiv_title } / { beehiiv_subtitle } / { beehiiv_title, beehiiv_subtitle }.
export async function generateNewsletterHeadline({ mode, newsletter }) {
  if (!config.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const brief = buildArticleBrief(newsletter);
  if (!brief) {
    // Guarded by the controller (NO_ARTICLES), but be defensive.
    throw new Error('Newsletter has no usable article content');
  }

  const wantTitle = mode === 'title' || mode === 'both';
  const wantSubtitle = mode === 'subtitle' || mode === 'both';

  // When regenerating one half, pair it against the other half if it's already
  // set, so the two read coherently together.
  const pairingNotes = [];
  if (wantSubtitle && !wantTitle && newsletter.beehiiv_title) {
    pairingNotes.push(
      `The title is already: "${newsletter.beehiiv_title}". Write a subtitle that complements it.`
    );
  }
  if (wantTitle && !wantSubtitle && newsletter.beehiiv_subtitle) {
    pairingNotes.push(
      `The subtitle is already: "${newsletter.beehiiv_subtitle}". Write a title that complements it.`
    );
  }

  const spec = [];
  if (wantTitle) {
    spec.push(
      `- "title": a short newsletter headline, no more than ${TITLE_MAX_CHARS} characters, no trailing punctuation.`
    );
  }
  if (wantSubtitle) {
    spec.push(
      `- "subtitle": a one-sentence deck, no more than ${SUBTITLE_MAX_CHARS} characters.`
    );
  }
  if (wantTitle && wantSubtitle) {
    spec.push('- The title and subtitle must read as a coherent pair.');
  }

  const keys = [wantTitle && '"title"', wantSubtitle && '"subtitle"']
    .filter(Boolean)
    .join(' and ');

  const userMessage = [
    "Today's Tonka Dispatch newsletter covers these articles, in order:",
    '',
    brief,
    '',
    ...(pairingNotes.length ? [pairingNotes.join('\n'), ''] : []),
    `Write copy that captures the most important themes across these stories.`,
    '',
    'Requirements:',
    ...spec,
    '',
    `Return ONLY a JSON object with ${keys} and no other text.`,
  ].join('\n');

  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const model = config.ANTHROPIC_MODEL || 'claude-haiku-4-5';

  const message = await client.messages.create({
    max_tokens: 256,
    messages: [{ content: userMessage, role: 'user' }],
    model,
    system: SYSTEM_PROMPT,
  });

  const text = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim();

  const parsed = extractJson(text);

  const result = {};
  if (wantTitle) {
    // Fall back to the raw reply for single-field modes if JSON parsing missed.
    const value = cleanLine(parsed.title ?? (mode === 'title' ? text : ''));
    if (!value) throw new Error('Model returned no title');
    result.beehiiv_title = value;
  }
  if (wantSubtitle) {
    const value = cleanLine(
      parsed.subtitle ?? (mode === 'subtitle' ? text : '')
    );
    if (!value) throw new Error('Model returned no subtitle');
    result.beehiiv_subtitle = value;
  }

  return result;
}
