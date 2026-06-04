// ----------------------------------------------------------------------------
// LLM router — picks the provider client based on the prompt package's
// meta.json. Node files just call callLlmFromPrompt(slug, ctx) and don't
// care which SDK runs.
//
// Model resolution precedence (highest wins):
//   1. overrides.model   — caller-supplied override (rare; mostly for tests)
//   2. per-node env var  — WRITERS_ROOM_MODEL_* (see SLUG_MODEL_CONFIG). Every
//                          node's model lives in env for cost visibility; this
//                          wins over meta.json. Defaults to the meta value, so
//                          unset = old behavior.
//   3. meta.model        — per-prompt model from prompts/<slug>/meta.json
//   4. provider env var  — OPENAI_MODEL / GEMINI_MODEL / PERPLEXITY_MODEL
//                          / ANTHROPIC_MODEL (the global default for that
//                          provider, defined in config/env.js)
// If all are empty we throw — there's nothing left to fall back to.
// ----------------------------------------------------------------------------

import { config } from '../../../config/env.js';
import {
  LLM_PROVIDER,
  PIPELINE_ERROR_CODE,
} from '../../../constants/writersroom.js';
import { logger } from '../../../utils/logger.js';
import {
  deepHasControlChars,
  deepSanitize,
} from '../../../utils/sanitizeControlChars.js';

import { callGemini } from './gemini.js';
import { loadAndRender } from './loadPrompt.js';
import { callOpenAi } from './openai.js';

// LLMs sometimes emit malformed unicode escapes for smart quotes / em-dashes
// (e.g. "" for U+2019), which JSON.parse decodes into raw C0 control
// characters that then get persisted into draft_markdown. Scrub every LLM
// result at this single chokepoint so no downstream node has to care.
function cleanLlmOutput(result, { model, provider, slug }) {
  if (!deepHasControlChars(result)) return result;
  logger.warn('[WritersRoom] LLM output contained control chars — sanitized', {
    model,
    provider,
    slug,
  });
  return deepSanitize(result);
}

// Map prompt slug → the config key holding that node's per-node model
// override. Keeps every node's model in env (cost visibility) without losing
// per-node specialization. Slugs not listed here just fall through to
// meta.model + provider default.
const SLUG_MODEL_CONFIG = {
  artDirector: 'WRITERS_ROOM_MODEL_ART_DIRECTOR',
  finalEditor: 'WRITERS_ROOM_MODEL_FINAL_EDITOR',
  futureStoryArc: 'WRITERS_ROOM_MODEL_FUTURE_ARC',
  genreToneRouter: 'WRITERS_ROOM_MODEL_ROUTER',
  headWriter: 'WRITERS_ROOM_MODEL_HEAD_WRITER',
  socialMediaDirector: 'WRITERS_ROOM_MODEL_SOCIAL_DIRECTOR',
  'writers/action': 'WRITERS_ROOM_MODEL_WRITERS',
  'writers/biographer': 'WRITERS_ROOM_MODEL_WRITERS_GEMINI',
  'writers/comedy': 'WRITERS_ROOM_MODEL_WRITERS',
  'writers/documentary': 'WRITERS_ROOM_MODEL_WRITERS_GEMINI',
  'writers/historic': 'WRITERS_ROOM_MODEL_WRITERS_GEMINI',
  'writers/scifi': 'WRITERS_ROOM_MODEL_WRITERS',
};

// Resolve a slug's per-node env model (null if the slug has no mapping).
function envNodeModelFor(slug) {
  const key = SLUG_MODEL_CONFIG[slug];
  return key ? config[key] : null;
}

// Map provider → the env var that holds its default model.
function envDefaultModelFor(provider) {
  switch (provider) {
    case LLM_PROVIDER.OPENAI:
    case LLM_PROVIDER.OPENAI_AGENT:
      return config.OPENAI_MODEL;
    case LLM_PROVIDER.GEMINI:
      return config.GEMINI_MODEL;
    case LLM_PROVIDER.PERPLEXITY:
      return config.PERPLEXITY_MODEL;
    case LLM_PROVIDER.ANTHROPIC:
      return config.ANTHROPIC_MODEL;
    default:
      return null;
  }
}

export async function callLlmFromPrompt(slug, ctx, overrides = {}) {
  const rendered = await loadAndRender(slug, ctx);
  const { meta, schema, system, user } = rendered;

  const provider = overrides.provider || meta.provider;
  const model =
    overrides.model ||
    envNodeModelFor(slug) ||
    meta.model ||
    envDefaultModelFor(provider);

  if (!provider || !model) {
    const err = new Error(
      `Prompt ${slug} has no resolvable model (provider=${provider}, meta.model=${meta.model}, env default=${envDefaultModelFor(provider)})`
    );
    err.code = PIPELINE_ERROR_CODE.PROMPT_NOT_FOUND;
    throw err;
  }

  const common = {
    maxOutputTokens: overrides.maxOutputTokens ?? meta.maxOutputTokens ?? null,
    model,
    system,
    temperature: overrides.temperature ?? meta.temperature ?? null,
    topP: overrides.topP ?? meta.topP ?? null,
    user,
  };

  if (provider === LLM_PROVIDER.GEMINI) {
    const result = await callGemini({
      ...common,
      jsonOutput: overrides.jsonOutput ?? meta.jsonOutput ?? false,
    });
    return cleanLlmOutput(result, { model, provider, slug });
  }

  if (
    provider === LLM_PROVIDER.OPENAI ||
    provider === LLM_PROVIDER.OPENAI_AGENT
  ) {
    const result = await callOpenAi({
      ...common,
      schema: schema || null,
      structuredOutputName: meta.structuredOutputName || null,
    });
    return cleanLlmOutput(result, { model, provider, slug });
  }

  const err = new Error(`Unsupported LLM provider for ${slug}: ${provider}`);
  err.code = PIPELINE_ERROR_CODE.LLM_CALL_FAILED;
  throw err;
}

export { callGemini, callOpenAi, envDefaultModelFor, loadAndRender };
