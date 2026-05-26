// ----------------------------------------------------------------------------
// Writer's Room — LLM key smoke tests.
//
// Validates that each configured provider key actually works against the
// wrappers the pipeline uses — catches revoked keys, deprecated models,
// and wrapper bugs before they show up in a failed cron run.
//
// SAFETY: each describe() is `skipIf` the corresponding env key is unset,
// so running `npx vitest run` in an environment without keys is a no-op
// for this file. When keys ARE set, each test fires ONE minimal request
// (~1–10 tokens of output) — negligible cost, but real network call.
//
// Run explicitly:
//   OPENAI_API_KEY=… GEMINI_API_KEY=… PERPLEXITY_API_KEY=… \
//     npx vitest run src/tests/writersRoom.llmKeys.spec.js
// ----------------------------------------------------------------------------

import { describe, expect, it } from 'vitest';

import { config } from '../config/env.js';
import { callGemini } from '../services/writersRoom/llm/gemini.js';
import { callLlmFromPrompt } from '../services/writersRoom/llm/index.js';
import { callOpenAi } from '../services/writersRoom/llm/openai.js';
import { callPerplexity } from '../services/writersRoom/llm/perplexity.js';

const HAS_OPENAI = Boolean(config.OPENAI_API_KEY);
const HAS_GEMINI = Boolean(config.GEMINI_API_KEY);
const HAS_PERPLEXITY = Boolean(config.PERPLEXITY_API_KEY);

// Generous timeout — cold-start LLM calls can take ~8s end-to-end.
const LLM_TIMEOUT_MS = 30000;

// Shared minimal probe — asks the model to respond with a single word.
// Keeps token usage near zero while still proving the round-trip works.
const PROBE_SYSTEM =
  'You are a connectivity test. Respond with exactly one word.';
const PROBE_USER = 'Say "ok" and nothing else.';

// ----------------------------------------------------------------------------

describe('LLM key smoke tests', () => {
  it('reports which provider keys + default models are configured', () => {
    // Always runs — its only job is to make the skip status visible in the
    // test output so the human reading the report knows what wasn't checked.

    console.log(
      '[LLM keys]',
      `OPENAI=${HAS_OPENAI ? 'set' : 'MISSING'} (default model: ${config.OPENAI_MODEL})`,
      `GEMINI=${HAS_GEMINI ? 'set' : 'MISSING'} (default model: ${config.GEMINI_MODEL})`,
      `PERPLEXITY=${HAS_PERPLEXITY ? 'set' : 'MISSING'} (default model: ${config.PERPLEXITY_MODEL})`
    );
    expect(true).toBe(true);
  });
});

// ----------------------------------------------------------------------------

describe.skipIf(!HAS_OPENAI)('OpenAI key + wrapper', () => {
  it(
    'completes a minimal chat call without throwing',
    async () => {
      const result = await callOpenAi({
        // Uses OPENAI_MODEL from env (default gpt-4o-mini) — the same
        // default the router falls back to for any prompt that doesn't
        // pin its own model in meta.json. If this test passes but a
        // specific node fails, that node is using a model your key
        // doesn't have access to (per-prompt meta.json overrides win).
        // Reasoning-tier models (Gemini 3.x pro, etc.) spend output tokens
        // on internal thinking, so a tiny limit can produce an empty
        // response. 64 is enough to validate the round-trip without burning
        // meaningful cost.
        maxOutputTokens: 64,
        model: config.OPENAI_MODEL,
        system: PROBE_SYSTEM,
        temperature: 0,
        user: PROBE_USER,
      });
      expect(typeof result).toBe('string');
      expect(result.trim().length).toBeGreaterThan(0);
    },
    LLM_TIMEOUT_MS
  );

  it(
    'returns structured JSON when given a response schema',
    async () => {
      const result = await callOpenAi({
        maxOutputTokens: 32,
        model: config.OPENAI_MODEL,
        schema: {
          additionalProperties: false,
          properties: { status: { type: 'string' } },
          required: ['status'],
          type: 'object',
        },
        structuredOutputName: 'probe',
        system:
          'Respond with valid JSON matching the schema. status should be "ok".',
        temperature: 0,
        user: 'Probe.',
      });
      expect(result).toMatchObject({ status: expect.any(String) });
    },
    LLM_TIMEOUT_MS
  );
});

// ----------------------------------------------------------------------------

describe.skipIf(!HAS_GEMINI)('Gemini key + wrapper', () => {
  it(
    'completes a minimal generateContent call without throwing',
    async () => {
      const result = await callGemini({
        // Reasoning-tier models (Gemini 3.x pro, etc.) spend output tokens
        // on internal thinking, so a tiny limit can produce an empty
        // response. 64 is enough to validate the round-trip without burning
        // meaningful cost.
        maxOutputTokens: 64,
        // Uses GEMINI_MODEL from env (default gemini-2.0-flash-lite).
        model: config.GEMINI_MODEL,
        system: PROBE_SYSTEM,
        temperature: 0,
        user: PROBE_USER,
      });
      expect(typeof result).toBe('string');
      expect(result.trim().length).toBeGreaterThan(0);
    },
    LLM_TIMEOUT_MS
  );

  it(
    'returns parsed JSON when jsonOutput is true',
    async () => {
      const result = await callGemini({
        jsonOutput: true,
        maxOutputTokens: 64,
        model: config.GEMINI_MODEL,
        system:
          'Respond with valid JSON only. Schema: { "status": "ok" }. No prose, no code fences.',
        temperature: 0,
        user: 'Probe.',
      });
      expect(result).toBeTypeOf('object');
      expect(result.status).toBeDefined();
    },
    LLM_TIMEOUT_MS
  );
});

// ----------------------------------------------------------------------------

describe.skipIf(!HAS_PERPLEXITY)('Perplexity key + wrapper', () => {
  it(
    'completes a minimal chat call and returns citations',
    async () => {
      const result = await callPerplexity({
        maxOutputTokens: 32,
        // Uses PERPLEXITY_MODEL from env (default sonar-pro).
        model: config.PERPLEXITY_MODEL,
        system: PROBE_SYSTEM,
        temperature: 0,
        user: 'What is the capital of France? One word.',
      });
      expect(result).toHaveProperty('raw');
      expect(result).toHaveProperty('citations');
      expect(typeof result.raw).toBe('string');
      expect(Array.isArray(result.citations)).toBe(true);
    },
    LLM_TIMEOUT_MS
  );

  it(
    'returns parsed JSON when jsonOutput is true',
    async () => {
      const result = await callPerplexity({
        jsonOutput: true,
        maxOutputTokens: 64,
        model: config.PERPLEXITY_MODEL,
        system:
          'Respond with valid JSON only. Schema: { "answer": string }. No prose, no code fences.',
        temperature: 0,
        user: 'Capital of France?',
      });
      expect(result).toHaveProperty('parsed');
      expect(result.parsed).toBeTypeOf('object');
      expect(result).toHaveProperty('citations');
    },
    LLM_TIMEOUT_MS
  );
});

// ----------------------------------------------------------------------------

describe.skipIf(!HAS_GEMINI)('LLM router end-to-end (genreToneRouter)', () => {
  // Verifies the integrated path the orchestrator actually takes:
  //   loadPrompt(slug) → render against ctx → dispatch to provider → parse.
  // Uses genreToneRouter because it's the only Gemini-backed node with
  // jsonOutput: true and a tiny, well-defined input — proves the full
  // call chain works without burning a full pipeline run.
  it(
    'loads + renders + calls the Gemini provider end-to-end',
    async () => {
      const result = await callLlmFromPrompt(
        'genreToneRouter',
        {
          creative: {
            creativity_to_reporter: 60,
            fact_to_fiction: 30,
            length: 'short',
            tone_strictness: 70,
          },
          project: {
            audience: 'used Class 8 truck buyers',
            brand: 'tonka_blog',
            mode: 'blog_post',
          },
          project_mode: 'blog_post',
          research: { enable_research: false, facts: null },
          story_seed: 'Connectivity probe — pick documentary',
          target_audience: 'used Class 8 truck buyers',
          target_brand: 'tonka_blog',
        },
        { jsonOutput: true }
      );

      expect(result).toBeTypeOf('object');
      expect(result.writers).toBeDefined();
      // The router prompt mandates all 6 roles in the response.
      const expectedRoles = [
        'action',
        'biographer',
        'comedy',
        'documentary',
        'historic',
        'scifi',
      ];
      for (const role of expectedRoles) {
        expect(
          result.writers[role],
          `router omitted role: ${role}`
        ).toBeDefined();
      }
    },
    LLM_TIMEOUT_MS
  );
});
