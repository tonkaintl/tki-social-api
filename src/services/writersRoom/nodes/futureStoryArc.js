// ----------------------------------------------------------------------------
// Future Story Arc Generator — port of n8n "Future Story Arc Generator".
//
// Suggests 3 follow-up story angles based on the final draft. Returns:
//   { arcs: [{ arc_title, one_line_premise, why_it_matters, suggested_story_seed }, ...] }
// ----------------------------------------------------------------------------

import { extractJson } from '../llm/extractJson.js';
import { callLlmFromPrompt } from '../llm/index.js';

const SLUG = 'futureStoryArc';

const EMPTY_ARC = { future_story_arc_generator: { arcs: [] } };

export async function futureStoryArc(ctx) {
  const result = await callLlmFromPrompt(SLUG, ctx);
  const parsed = typeof result === 'string' ? extractJson(result) : result;
  return {
    ...ctx,
    future_arcs:
      parsed?.future_story_arc_generator?.arcs ||
      EMPTY_ARC.future_story_arc_generator.arcs,
  };
}

// n8n "Set Default Future Story Arc Generator" — used when
// outputs.future_story_arc is false.
export function defaultFutureStoryArc(ctx) {
  return { ...ctx, future_arcs: [] };
}
