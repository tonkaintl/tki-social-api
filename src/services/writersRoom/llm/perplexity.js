// ----------------------------------------------------------------------------
// Perplexity client wrapper for the Writers Room researcher node.
//
// Perplexity exposes an OpenAI-compatible chat-completions endpoint at
// https://api.perplexity.ai/chat/completions. Same auth pattern (Bearer
// token), same message shape — plus the response includes a `citations`
// array of URLs the model used. We don't pull in the OpenAI SDK pointed at
// this base URL because the citation field is non-standard; raw HTTP is
// simpler and keeps it transparent what we send/receive.
//
// Models (per https://docs.perplexity.ai):
//   sonar              — fastest, cheapest, lighter coverage
//   sonar-pro          — broader coverage, longer citations  ← default
//   sonar-reasoning    — chain-of-thought, slower
//   sonar-deep-research — multi-step research, much slower/$$$
// ----------------------------------------------------------------------------

import axios from 'axios';

import { config } from '../../../config/env.js';
import { PIPELINE_ERROR_CODE } from '../../../constants/writersroom.js';
import { logger } from '../../../utils/logger.js';

import { extractJson } from './extractJson.js';

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';

export async function callPerplexity({
  jsonOutput = false,
  maxOutputTokens = null,
  model,
  system,
  temperature = null,
  topP = null,
  user,
}) {
  if (!config.PERPLEXITY_API_KEY) {
    const err = new Error('PERPLEXITY_API_KEY not configured');
    err.code = PIPELINE_ERROR_CODE.MISSING_API_KEY;
    throw err;
  }

  const messages = [];
  if (system) messages.push({ content: system, role: 'system' });
  if (user) messages.push({ content: user, role: 'user' });

  const body = { messages, model };
  if (temperature !== null && temperature !== undefined) {
    body.temperature = temperature;
  }
  if (topP !== null && topP !== undefined) body.top_p = topP;
  if (maxOutputTokens) body.max_tokens = maxOutputTokens;
  // Perplexity does NOT support OpenAI's `response_format: { type: 'json_object' }`
  // — they only accept `{ type: 'text' }` (default) or `{ type: 'json_schema', ... }`
  // with a full JSON schema. For schema-free "just give me JSON" we rely on
  // the prompt itself to instruct JSON-only output (the researcher's
  // system.md does this explicitly) and parse the result below.
  // If the caller wants strict schema enforcement, pass a schema via
  // the prompt-loading path that supports it.

  let response;
  try {
    response = await axios.post(PERPLEXITY_URL, body, {
      headers: {
        Authorization: `Bearer ${config.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    });
  } catch (err) {
    const detail = err.response?.data || err.message;
    logger.error('[WritersRoom] Perplexity call failed', {
      detail,
      model,
      status: err.response?.status,
    });
    const wrap = new Error(`Perplexity call failed: ${err.message}`);
    wrap.code = PIPELINE_ERROR_CODE.LLM_CALL_FAILED;
    wrap.cause = err;
    throw wrap;
  }

  const text = response.data?.choices?.[0]?.message?.content || '';
  // Perplexity returns citations at the response level (sibling of `choices`)
  // — an array of URL strings, in source order.
  const citations = Array.isArray(response.data?.citations)
    ? response.data.citations
    : [];

  if (jsonOutput) {
    try {
      // Perplexity has no native JSON-object mode (unlike OpenAI), so the
      // model often wraps output in prose + ```json fences. extractJson
      // handles both clean JSON and wrapped-with-preamble cases.
      return { citations, parsed: extractJson(text), raw: text };
    } catch (err) {
      logger.error('[WritersRoom] Perplexity returned invalid JSON', {
        error: err.message,
        model,
        textPreview: text.slice(0, 200),
      });
      const wrap = new Error('Perplexity returned invalid JSON');
      wrap.code = PIPELINE_ERROR_CODE.LLM_CALL_FAILED;
      throw wrap;
    }
  }

  return { citations, raw: text };
}
