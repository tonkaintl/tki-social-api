// ----------------------------------------------------------------------------
// Shared brainstorm runner — all 6 writer nodes (comedy, historic,
// biographer, scifi, documentary, action) call the same LLM-with-JSON-schema
// pattern. Each writer-specific file just provides its prompt slug and
// the orchestrator passes the role-specific context.
//
// Returns the normalized writer note (n8n had a separate "Normalize <X>
// Notes" code node — we fold that step in here for cleanliness).
// ----------------------------------------------------------------------------

import { extractJson } from '../../llm/extractJson.js';
import { callLlmFromPrompt } from '../../llm/index.js';

function normalizeNote(raw, role, weight) {
  // n8n's Normalize Notes code nodes coerced the LLM output into a
  // consistent { role, notes: string[], weight: number } shape regardless
  // of how loosely the model followed the schema.
  const notes = Array.isArray(raw?.notes)
    ? raw.notes.filter(n => typeof n === 'string' && n.trim().length > 0)
    : [];
  return {
    notes,
    role,
    weight: typeof raw?.weight === 'number' ? raw.weight : (weight ?? 0),
  };
}

export async function runWriterBrainstorm({ ctx, role, slug }) {
  const weight = ctx?.writers?.[role]?.weight ?? 0;
  const result = await callLlmFromPrompt(slug, ctx);
  // OpenAI nodes return parsed JSON (schema-enforced); the writer
  // brainstorms all have JSON schemas so result is already an object.
  // If the prompt is plain-text-returning we still get a string — try to
  // parse before normalizing.
  let parsed = result;
  if (typeof result === 'string') {
    try {
      parsed = extractJson(result);
    } catch {
      parsed = { notes: [result], role, weight };
    }
  }
  return normalizeNote(parsed, role, weight);
}
