// ----------------------------------------------------------------------------
// OpenAI client wrapper for the Writers Room pipeline.
//
// Single function: callOpenAi({ model, system, user, schema, ... }) → parsed
// JSON when schema is provided, raw string otherwise.
// ----------------------------------------------------------------------------

import OpenAI from 'openai';

import { config } from '../../../config/env.js';
import { PIPELINE_ERROR_CODE } from '../../../constants/writersroom.js';
import { logger } from '../../../utils/logger.js';

let client = null;

function getClient() {
  if (client) return client;
  if (!config.OPENAI_API_KEY) {
    const err = new Error('OPENAI_API_KEY not configured');
    err.code = PIPELINE_ERROR_CODE.MISSING_API_KEY;
    throw err;
  }
  client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  return client;
}

export async function callOpenAi({
  maxOutputTokens = null,
  model,
  schema = null,
  structuredOutputName = null,
  system,
  temperature = null,
  topP = null,
  user,
}) {
  const openai = getClient();

  const messages = [];
  if (system) messages.push({ content: system, role: 'system' });
  if (user) messages.push({ content: user, role: 'user' });

  const params = { messages, model };
  if (temperature !== null && temperature !== undefined) {
    params.temperature = temperature;
  }
  if (topP !== null && topP !== undefined) params.top_p = topP;
  if (maxOutputTokens) params.max_completion_tokens = maxOutputTokens;

  if (schema) {
    params.response_format = {
      json_schema: {
        name: structuredOutputName || 'response_schema',
        schema,
        strict: false,
      },
      type: 'json_schema',
    };
  }

  let response;
  try {
    response = await openai.chat.completions.create(params);
  } catch (err) {
    logger.error('[WritersRoom] OpenAI call failed', {
      error: err.message,
      model,
    });
    const wrap = new Error(`OpenAI call failed: ${err.message}`);
    wrap.code = PIPELINE_ERROR_CODE.LLM_CALL_FAILED;
    wrap.cause = err;
    throw wrap;
  }

  const text = response.choices?.[0]?.message?.content || '';

  if (schema) {
    try {
      return JSON.parse(text);
    } catch (err) {
      logger.error('[WritersRoom] OpenAI returned invalid JSON', {
        error: err.message,
        model,
        textPreview: text.slice(0, 200),
      });
      const wrap = new Error('OpenAI returned invalid JSON');
      wrap.code = PIPELINE_ERROR_CODE.LLM_CALL_FAILED;
      throw wrap;
    }
  }

  return text;
}
