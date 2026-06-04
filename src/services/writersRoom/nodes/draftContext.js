// ----------------------------------------------------------------------------
// Draft Context — collapses three n8n nodes into one step:
//   1. "Switch Target Brand"           → attaches brand registry data
//   2. "Apply Project Mode Profile"    → attaches mode registry data
//   3. "Normalize Draft Context"       → ensures consistent shape for the Head
//                                        Writer prompt
//
// Output adds to ctx:
//   target_brand: { id, project: { name, voice, tagline, guidelines } }
//   project.brand_meta: <same project block>
//   project_mode_profile: { label, description, headWriterInstructions, ... }
//   head_writer_system_message: <fully assembled string>
//   brand_do_list / brand_dont_list / brand_style_examples (pre-rendered for
//     the head writer + final editor prompts)
// ----------------------------------------------------------------------------

import {
  formatTellsForPrompt,
  loadPreventableTells,
} from '../aiTells.service.js';
import { getBrandConfig } from '../profiles/brands.js';
import {
  buildHeadWriterSystemMessage,
  getProjectModeProfile,
} from '../profiles/projectModes.js';

function asList(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items.map(d => `- ${d}`).join('\n');
}

export async function draftContext(ctx) {
  const brandKey =
    typeof ctx.target_brand === 'string'
      ? ctx.target_brand
      : ctx.project?.brand || 'generic_brand';
  const brandConfig = getBrandConfig(brandKey);

  const modeKey = ctx.project_mode || 'default_mode';
  const modeProfile = getProjectModeProfile(modeKey);

  // Pull the banned-phrase block from the same active tells dictionary the
  // post-draft scan uses, so admin edits drive prevention + detection from
  // one source. Cached load — no extra Mongo query per run.
  const bannedPhrases = formatTellsForPrompt(await loadPreventableTells());

  const headWriterSystemMessage = buildHeadWriterSystemMessage({
    audience: ctx.project?.audience || ctx.target_audience || '',
    bannedPhrases,
    brandMeta: brandConfig.project,
    modeKey,
    modeProfile,
    sliders: ctx.creative || {},
    storySeed: ctx.story_seed || '',
    writerPanel: ctx.writer_panel || [],
  });

  return {
    ...ctx,
    brand_do_list: asList(brandConfig.project.guidelines?.do),
    brand_dont_list: asList(brandConfig.project.guidelines?.dont),
    brand_guidelines_json: JSON.stringify(
      brandConfig.project.guidelines || {},
      null,
      2
    ),
    brand_style_examples: asList(
      brandConfig.project.guidelines?.style_examples
    ),
    head_writer_system_message: headWriterSystemMessage,
    project: {
      ...ctx.project,
      brand: brandKey,
      brand_meta: brandConfig.project,
    },
    project_mode_profile: modeProfile,
    project_mode_profile_json: JSON.stringify(modeProfile, null, 2),
    research_findings_text: asList(ctx.research?.findings),
    target_brand: { id: brandKey, ...brandConfig },
  };
}
