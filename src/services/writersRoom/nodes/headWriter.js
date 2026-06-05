// ----------------------------------------------------------------------------
// Head Writer — port of n8n "Head Writer Agent (OpenAI)".
//
// Takes the merged writer notes + brand voice + research findings and
// produces the actual draft. The n8n version was a langchain "agent" node
// (chat model + structured output via Zod). We collapse to a single
// OpenAI chat call with JSON-mode output; the agent abstraction wasn't
// adding tools, just structured output.
//
// Expected output shape (from the n8n prompt):
//   { role: 'head_writer', title, thesis, draft_text, summary }
// ----------------------------------------------------------------------------

import { extractJson } from '../llm/extractJson.js';
import { callLlmFromPrompt } from '../llm/index.js';

const SLUG = 'headWriter';

const FALLBACK_SCHEMA = {
  additionalProperties: false,
  properties: {
    draft_text: { type: 'string' },
    role: { type: 'string' },
    summary: { type: 'string' },
    thesis: { type: 'string' },
    title: { type: 'string' },
  },
  required: ['role', 'title', 'thesis', 'draft_text', 'summary'],
  type: 'object',
};

// Pre-render the bits the n8n prompt expected to find via JSON.stringify
// expressions ({{writer_panel}}, {{writer_notes}}, project_mode_profile).
// The prompt loader can't evaluate JS, so we pass them in as already-
// stringified context fields the loader will substitute via {{path.to.value}}.
function buildHeadWriterContext(ctx) {
  return {
    ...ctx,
    writer_notes_json: JSON.stringify(ctx.writer_notes || {}, null, 2),
    writer_panel_json: JSON.stringify(ctx.writer_panel || [], null, 2),
  };
}

export async function headWriter(ctx) {
  const enriched = buildHeadWriterContext(ctx);
  const result = await callLlmFromPrompt(SLUG, enriched, {
    // n8n agent had no JSON schema set in the meta — we attach one so the
    // OpenAI client returns structured JSON.
    schema: FALLBACK_SCHEMA,
    structuredOutputName: 'head_writer_schema',
  });

  // OpenAI provider returns parsed JSON when schema is present.
  return {
    ...ctx,
    head_draft: typeof result === 'string' ? extractJson(result) : result,
  };
}
