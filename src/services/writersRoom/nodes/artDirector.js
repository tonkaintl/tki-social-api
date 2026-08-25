// ----------------------------------------------------------------------------
// Art Director — port of n8n "Art Director (OpenAI)".
//
// Generates exactly 5 still-image prompts (hero, detail, process,
// environment, metaphor) grounded in the final draft. Returns:
//   { visual_prompts: [{ id, intent, prompt }, ...] }
// ----------------------------------------------------------------------------

import { extractJson } from '../llm/extractJson.js';
import { callLlmFromPrompt } from '../llm/index.js';
import { contextualMachineHint } from '../machineHint.js';

const SLUG = 'artDirector';

const DEFAULT_VISUAL_PROMPTS = { visual_prompts: [] };

// What the hint picker scores for industry signals. Title/thesis/summary are
// kept separate from the body because a signal in the headline material says
// what the article IS ABOUT, while one in the body is often just an anecdote.
export function articleTextFor(ctx) {
  const draft = ctx?.final_draft || {};
  return {
    body: draft.draft_markdown || '',
    headline: [draft.title, draft.thesis, draft.summary]
      .filter(Boolean)
      .join('\n'),
  };
}

export async function artDirector(ctx) {
  // Inject a machine hint so generic articles rotate across the full industrial
  // range instead of defaulting to excavators/dozers/semi tractors. The pick is
  // CONTEXT AWARE — it scores the draft for industry signals and rotates within
  // the matching industry — so a forestry article gets forestry iron rather than
  // a coin flip. Resolved once here so all 5 prompts in this run share the same
  // machine. The prompt only overrides it when the article's SUBJECT is its own
  // specific machine.
  const withHint = {
    ...ctx,
    machine_hint:
      ctx.machine_hint || contextualMachineHint(articleTextFor(ctx)),
  };
  const result = await callLlmFromPrompt(SLUG, withHint);
  const parsed = typeof result === 'string' ? extractJson(result) : result;
  return {
    ...ctx,
    visual_prompts:
      parsed?.visual_prompts || DEFAULT_VISUAL_PROMPTS.visual_prompts,
  };
}

// n8n "Set Default Visual Prompts" — used when outputs.visual_prompts is false.
export function defaultVisualPrompts(ctx) {
  return { ...ctx, visual_prompts: [] };
}
