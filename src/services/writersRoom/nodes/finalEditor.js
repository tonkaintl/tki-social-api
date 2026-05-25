// ----------------------------------------------------------------------------
// Final Editor — port of n8n "Final Editor (OpenAI)".
//
// Light line-edit pass over the head writer's draft. Does NOT restructure
// or invent content (per the prompt). Returns the polished draft as
// { role, title, thesis, story, summary }.
// ----------------------------------------------------------------------------

import { callLlmFromPrompt } from '../llm/index.js';

const SLUG = 'finalEditor';

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
  const parsed = typeof result === 'string' ? JSON.parse(result) : result;
  return {
    ...ctx,
    final_draft: {
      ...parsed,
      // Keep the head writer's own draft_markdown alongside the editor's
      // polished "story" — the social media director needs both.
      draft_markdown:
        parsed.story ||
        parsed.draft_markdown ||
        enriched.head_draft.draft_markdown,
    },
  };
}
