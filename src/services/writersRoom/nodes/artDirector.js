// ----------------------------------------------------------------------------
// Art Director — port of n8n "Art Director (OpenAI)".
//
// Generates exactly 5 still-image prompts (hero, detail, process,
// environment, metaphor) grounded in the final draft. Returns:
//   { visual_prompts: [{ id, intent, prompt }, ...] }
// ----------------------------------------------------------------------------

import { extractJson } from '../llm/extractJson.js';
import { callLlmFromPrompt } from '../llm/index.js';
import { randomMachineHint } from '../machineHint.js';

const SLUG = 'artDirector';

const DEFAULT_VISUAL_PROMPTS = { visual_prompts: [] };

export async function artDirector(ctx) {
  // Inject a random machine hint so generic articles rotate across the full
  // industrial range instead of defaulting to excavators/dozers. Resolved once
  // here so all 5 prompts in this run share the same machine. The prompt only
  // uses it when the article names no machine of its own.
  const withHint = {
    ...ctx,
    machine_hint: ctx.machine_hint || randomMachineHint(),
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
