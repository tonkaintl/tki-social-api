// ----------------------------------------------------------------------------
// Gemini client wrapper for the Writers Room pipeline.
//
// Uses the @google/genai SDK. n8n stored Gemini's "model" role as a system-
// like instruction; we collapse system + model into a single systemInstruction
// at the loader level and treat anything else as a user turn.
// ----------------------------------------------------------------------------

import { GoogleGenAI } from '@google/genai';

import { config } from '../../../config/env.js';
import { PIPELINE_ERROR_CODE } from '../../../constants/writersroom.js';
import { logger } from '../../../utils/logger.js';

import { extractJson } from './extractJson.js';

let client = null;

function getClient() {
  if (client) return client;
  if (!config.GEMINI_API_KEY) {
    const err = new Error('GEMINI_API_KEY not configured');
    err.code = PIPELINE_ERROR_CODE.MISSING_API_KEY;
    throw err;
  }
  client = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  return client;
}

// model in our meta files is in the form "models/gemini-2.0-flash-lite";
// the @google/genai SDK takes the bare id, so strip the prefix.
function normalizeModel(model) {
  if (!model) return model;
  return model.startsWith('models/') ? model.slice('models/'.length) : model;
}

export async function callGemini({
  jsonOutput = false,
  maxOutputTokens = null,
  model,
  system,
  temperature = null,
  topP = null,
  user,
}) {
  const genai = getClient();
  const modelId = normalizeModel(model);

  const generationConfig = {};
  if (temperature !== null && temperature !== undefined) {
    generationConfig.temperature = temperature;
  }
  if (topP !== null && topP !== undefined) generationConfig.topP = topP;
  if (maxOutputTokens) generationConfig.maxOutputTokens = maxOutputTokens;
  if (jsonOutput) generationConfig.responseMimeType = 'application/json';
  // Gemini 2.5+ has internal thinking enabled by default. It silently
  // consumes maxOutputTokens before any visible output — burning your
  // budget on hidden reasoning even on non-reasoning tiers. Disable it
  // here so the full token budget goes to the actual response.
  generationConfig.thinkingConfig = { thinkingBudget: 0 };

  let response;
  try {
    response = await genai.models.generateContent({
      config: {
        ...generationConfig,
        systemInstruction: system || undefined,
      },
      contents: user || '',
      model: modelId,
    });
  } catch (err) {
    logger.error('[WritersRoom] Gemini call failed', {
      error: err.message,
      model: modelId,
    });
    const wrap = new Error(`Gemini call failed: ${err.message}`);
    wrap.code = PIPELINE_ERROR_CODE.LLM_CALL_FAILED;
    wrap.cause = err;
    throw wrap;
  }

  const text = response.text || '';

  if (jsonOutput) {
    try {
      // Reasoning models (gemini-3.x-pro) often ignore responseMimeType
      // and wrap JSON in prose + fences. extractJson handles both clean
      // JSON and "Here is the JSON:\n```json\n{...}\n```" cases.
      return extractJson(text);
    } catch (err) {
      logger.error('[WritersRoom] Gemini returned invalid JSON', {
        error: err.message,
        model: modelId,
        textPreview: text.slice(0, 200),
      });
      const wrap = new Error('Gemini returned invalid JSON');
      wrap.code = PIPELINE_ERROR_CODE.LLM_CALL_FAILED;
      throw wrap;
    }
  }

  return text;
}
