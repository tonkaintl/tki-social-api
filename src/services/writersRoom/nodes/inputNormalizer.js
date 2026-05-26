// ----------------------------------------------------------------------------
// Input Normalizer — port of the n8n code node by the same name.
//
// Takes whatever shape the caller posts (mostly strings from the original
// n8n form) and coerces it into the shape every downstream node expects.
// Defaults match PIPELINE_INPUT_DEFAULTS in constants/writersroom.js.
// ----------------------------------------------------------------------------

import {
  DRAFT_LENGTH_VALUES,
  PIPELINE_INPUT_DEFAULTS,
} from '../../../constants/writersroom.js';

function val(v, def) {
  return v === undefined || v === null || v === '' ? def : v;
}

function num(v, def) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function bool(v, def) {
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return def;
}

function pickLength(v, def) {
  const s = String(val(v, def)).toLowerCase().trim();
  return DRAFT_LENGTH_VALUES.includes(s) ? s : def;
}

export function inputNormalizer(src = {}) {
  return {
    draft: {
      length: pickLength(
        src.draft_length,
        PIPELINE_INPUT_DEFAULTS.draft_length
      ),
    },
    notifier_email: val(src.notifier_email, ''),
    outputs: {
      blog_post: bool(
        src.output_blog_post,
        PIPELINE_INPUT_DEFAULTS.output_blog_post
      ),
      future_story_arc: bool(
        src.output_future_story_arc,
        PIPELINE_INPUT_DEFAULTS.output_future_story_arc
      ),
      gdocs_folder_id: val(src.gdocs_folder_id, null),
      reference_doc: bool(
        src.output_reference_doc,
        PIPELINE_INPUT_DEFAULTS.output_reference_doc
      ),
      visual_prompts: bool(
        src.output_visual_prompts,
        PIPELINE_INPUT_DEFAULTS.output_visual_prompts
      ),
    },
    project_mode: val(src.project_mode, PIPELINE_INPUT_DEFAULTS.project_mode),
    raw: src,
    research: {
      enable_research: bool(
        src.enable_research,
        PIPELINE_INPUT_DEFAULTS.enable_research
      ),
      facts: val(src.facts, null),
    },
    sliders: {
      creativity_to_reporter: num(src.creativity_to_reporter, 50),
      fact_to_fiction: num(
        src.fact_to_fiction,
        PIPELINE_INPUT_DEFAULTS.fact_to_fiction
      ),
      tone_strictness: num(
        src.tone_strictness,
        PIPELINE_INPUT_DEFAULTS.tone_strictness
      ),
    },
    story_seed: val(src.story_seed, ''),
    target_audience: val(src.target_audience, ''),
    target_brand: val(src.target_brand, PIPELINE_INPUT_DEFAULTS.target_brand),
  };
}
