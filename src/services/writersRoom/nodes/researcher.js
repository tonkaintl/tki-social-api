// ----------------------------------------------------------------------------
// Researcher — port of n8n "Writer Researcher (Perplexity)" + "Normalize
// Research" + "Merge Citations".
//
// Runs in parallel with the writer brainstorms when ctx.research.enable_research
// is true. Calls Perplexity to gather grounded facts about the story_seed,
// returns a normalized { findings, topics_covered, citations } block.
//
// The orchestrator merges `findings` into ctx.research before draftContext
// runs, so the head writer prompt's research_findings_text placeholder
// renders correctly. Citations stay on ctx.research.citations for downstream
// consumers (gDocs notes export, debug responses).
// ----------------------------------------------------------------------------

import { config } from '../../../config/env.js';
import { PIPELINE_ERROR_CODE } from '../../../constants/writersroom.js';
import { logger } from '../../../utils/logger.js';
import { loadAndRender } from '../llm/loadPrompt.js';
import { callPerplexity } from '../llm/perplexity.js';

const SLUG = 'researcher';

function normalizeFindings(parsed) {
  // Defensive: Perplexity is told to return { findings: string[], topics_covered: string[] }
  // but models occasionally wrap, rename, or stringify nested values.
  const findings = Array.isArray(parsed?.findings)
    ? parsed.findings
        .filter(f => typeof f === 'string' && f.trim().length > 0)
        .map(f => f.trim())
    : [];
  const topics = Array.isArray(parsed?.topics_covered)
    ? parsed.topics_covered
        .filter(t => typeof t === 'string' && t.trim().length > 0)
        .map(t => t.trim())
    : [];
  return { findings, topics_covered: topics };
}

// Run the research call and return the normalized result. Used by both
// the orchestrator (where it runs in parallel with writers) and the
// test-node endpoint (where it runs against a manually-constructed context).
//
// IMPORTANT: this node returns a *partial* ctx fragment — { research: {...} }
// — NOT a full ctx merge. The orchestrator merges it back in. This keeps
// the parallel research + writer fan-out from racing on the same ctx
// shape: each parallel branch returns its own piece, the orchestrator
// stitches them together at the merge step.
export async function researcher(ctx) {
  // Single bail-out: if research isn't enabled, this node is a no-op that
  // preserves whatever facts were already passed in.
  if (!ctx?.research?.enable_research) {
    return {
      research: {
        citations: [],
        enable_research: false,
        facts: ctx?.research?.facts || null,
        findings: [],
        topics_covered: [],
      },
    };
  }

  const rendered = await loadAndRender(SLUG, ctx);
  const meta = rendered.meta || {};

  try {
    const result = await callPerplexity({
      jsonOutput: true,
      maxOutputTokens: meta.maxOutputTokens || null,
      // Model precedence: WRITERS_ROOM_MODEL_RESEARCHER (per-node env, the
      // visible cost knob) → prompts/researcher/meta.json → PERPLEXITY_MODEL.
      // Mirrors the LLM router's per-node resolution.
      model:
        config.WRITERS_ROOM_MODEL_RESEARCHER ||
        meta.model ||
        config.PERPLEXITY_MODEL,
      system: rendered.system,
      temperature: meta.temperature ?? 0.2,
      topP: meta.topP ?? null,
      user: rendered.user,
    });

    const { findings, topics_covered } = normalizeFindings(result.parsed);

    logger.info('[WritersRoom] Research complete', {
      citationCount: result.citations.length,
      findingCount: findings.length,
      story_seed: ctx.story_seed,
      topicCount: topics_covered.length,
    });

    return {
      research: {
        citations: result.citations,
        enable_research: true,
        facts: ctx.research.facts || null,
        findings,
        topics_covered,
      },
    };
  } catch (err) {
    // Research failure should NOT kill the pipeline — the head writer can
    // still produce a piece without findings. Log loudly, return empty
    // findings, and let the orchestrator carry on.
    logger.error(
      '[WritersRoom] Research call failed; continuing without findings',
      {
        error: err.message,
        errorCode: err.code,
        story_seed: ctx.story_seed,
      }
    );
    return {
      research: {
        citations: [],
        enable_research: true,
        error: {
          code: err.code || PIPELINE_ERROR_CODE.RESEARCH_FAILED,
          message: err.message,
        },
        facts: ctx.research.facts || null,
        findings: [],
        topics_covered: [],
      },
    };
  }
}
