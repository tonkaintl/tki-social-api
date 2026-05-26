// ----------------------------------------------------------------------------
// Genre Tone Router — port of n8n "Genre Tone Router (Gemini)".
//
// Decides which of the 6 writer roles to enable and how heavily each
// influences the piece. Returns a {writers: {role: {enabled, weight}}} map
// that downstream gates use to fan out to brainstorm calls.
// ----------------------------------------------------------------------------

import { callLlmFromPrompt } from '../llm/index.js';

const SLUG = 'genreToneRouter';

// Defensive normalizer — clamps weights to [0,1], drops unknown roles,
// and falls back to a balanced panel if the LLM returns an unparseable
// shape. The n8n flow used this as the source of truth for all gates
// downstream, so we must always return a valid writers map.
function normalizeWriters(raw) {
  const KNOWN = [
    'comedy',
    'historic',
    'biographer',
    'scifi',
    'documentary',
    'action',
  ];
  const out = {};
  for (const role of KNOWN) {
    const cfg = raw?.writers?.[role] || {};
    const weight = Math.max(0, Math.min(1, Number(cfg.weight) || 0));
    out[role] = {
      enabled: Boolean(cfg.enabled) && weight > 0,
      weight,
    };
  }
  // If the LLM returned all zeros (or all disabled), force documentary on
  // so the pipeline still produces something useful.
  const anyEnabled = KNOWN.some(r => out[r].enabled);
  if (!anyEnabled) {
    out.documentary = { enabled: true, weight: 1 };
  }
  return out;
}

export async function genreToneRouter(ctx) {
  const result = await callLlmFromPrompt(SLUG, ctx, {
    // Gemini returns text; the prompt says "respond ONLY with JSON" so we
    // ask for json mime type via override.
    jsonOutput: true,
  });

  const writers = normalizeWriters(result);

  return {
    ...ctx,
    writers,
  };
}
