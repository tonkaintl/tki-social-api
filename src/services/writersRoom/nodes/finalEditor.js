// ----------------------------------------------------------------------------
// Final Editor — port of n8n "Final Editor (OpenAI)".
//
// Light line-edit pass over the head writer's draft. Does NOT restructure
// or invent content (per the prompt). Returns the polished draft as
// { role, title, thesis, story, summary }.
//
// Length backstop: the editor is supposed to line-edit, not summarize, but
// small models intermittently collapse the draft (observed: 472 words -> 87).
// If the edited story falls below FINAL_EDITOR_MIN_LENGTH_RATIO of the head
// writer's draft, we discard the editor's body and keep the head writer's
// draft text (already clean prose). The editor's length-insensitive fields
// (title/thesis/summary) are kept either way.
// ----------------------------------------------------------------------------

import { FINAL_EDITOR_MIN_LENGTH_RATIO } from '../../../constants/writersroom.js';
import { logger } from '../../../utils/logger.js';
import { extractJson } from '../llm/extractJson.js';
import { callLlmFromPrompt } from '../llm/index.js';

const SLUG = 'finalEditor';

function wordCount(s) {
  return typeof s === 'string'
    ? s.trim().split(/\s+/).filter(Boolean).length
    : 0;
}

// Citation markers like [1] or [1][4][10] sometimes survive from the research
// findings into the body. We never want them in the article (sources are
// tracked separately on the run/spark record), so strip them deterministically
// as the final pass — regardless of what the head writer or editor produced.
// Only horizontal whitespace is consumed so line breaks are preserved.
function stripCitationMarkers(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/[^\S\r\n]*\[\d+\]/g, '').replace(/[^\S\r\n]{2,}/g, ' ');
}

function buildFinalEditorContext(ctx) {
  return {
    ...ctx,
    brand_guidelines_json: JSON.stringify(
      ctx.target_brand?.project?.guidelines || {},
      null,
      2
    ),
    head_draft: {
      ...ctx.head_draft,
      // n8n's prompt referenced head_draft.draft_markdown; the head writer
      // model returned draft_text. Normalize so both names work.
      draft_markdown:
        ctx.head_draft?.draft_markdown || ctx.head_draft?.draft_text || '',
    },
  };
}

export async function finalEditor(ctx) {
  const enriched = buildFinalEditorContext(ctx);
  const result = await callLlmFromPrompt(SLUG, enriched);
  const parsed = typeof result === 'string' ? extractJson(result) : result;

  const sourceDraft = enriched.head_draft.draft_markdown || '';
  const editedStory = parsed.story || parsed.draft_markdown || '';
  const sourceWords = wordCount(sourceDraft);
  const editedWords = wordCount(editedStory);

  // Backstop: if the editor over-compressed, fall back to the head writer's
  // draft so we never publish a full story as a teaser.
  const overCompressed =
    sourceWords > 0 &&
    editedWords < Math.floor(sourceWords * FINAL_EDITOR_MIN_LENGTH_RATIO);

  if (overCompressed) {
    logger.warn(
      '[WritersRoom] Final editor over-compressed draft — keeping head writer draft',
      {
        editedWords,
        minWords: Math.floor(sourceWords * FINAL_EDITOR_MIN_LENGTH_RATIO),
        sourceWords,
      }
    );
  }

  const story = stripCitationMarkers(
    overCompressed ? sourceDraft : editedStory
  );

  return {
    ...ctx,
    final_draft: {
      ...parsed,
      // Keep story + draft_markdown in sync (the social media director needs
      // both). On backstop, both carry the head writer's draft.
      draft_markdown: story || enriched.head_draft.draft_markdown,
      story,
    },
  };
}
