// ----------------------------------------------------------------------------
// Project mode registry — port of PROJECT_MODE_CONFIGS from the n8n
// "Apply Project Mode Profile" code node.
//
// Each entry defines how the Head Writer should approach the piece for that
// mode (instructions, structure hints, optional task lines).
// ----------------------------------------------------------------------------

export const PROJECT_MODE_CONFIGS = {
  blog_post: {
    description:
      'Write a clear, engaging blog post that blends story, insight, and practical value for the reader.',
    headWriterInstructions: [
      'Open with a strong hook that makes the reader feel seen.',
      'Blend real-world examples and clear explanations.',
      'Focus on one main idea or lesson, not everything at once.',
      'Use headings and short paragraphs so it is easy to skim.',
    ],
    label: 'Blog post',
    structureHints: [
      'Hook / problem the reader recognizes.',
      'Context or a short anecdote that illustrates the issue.',
      'Breakdown of what’s really going on.',
      'Concrete recommendations or steps.',
      'Short closing that reinforces the main takeaway.',
    ],
    taskLines: [
      'Treat the story_seed and writer_notes as conceptual origin only, not as a literal fable you must retell.',
      'Write a professional Tonka Blog article for working truck buyers, not a children’s story.',
      'Keep any allegory or metaphor to at most 1–2 short lines of framing, then focus on clear, practical guidance.',
      'Use the research findings to ground inspections, risk, and process details whenever you describe “what to do”.',
      'Use headings and short paragraphs; prioritize clarity and usefulness over cleverness.',
      'Avoid extended scenes about mice or characters; anchor the piece in inspections, deals, and shop-floor reality.',
    ],
  },

  default_mode: {
    description:
      'Fallback mode when project_mode is unknown; sensible mixed behavior.',
    headWriterInstructions: [
      'Tell a clear story.',
      'Explain the lesson in plain language.',
    ],
    label: 'Generic narrative + explanation',
    structureHints: ['Begin–middle–end, with one clear takeaway.'],
    taskLines: [
      'Use the writer_panel as your internal outline and weighting guide.',
      'Write a single, coherent draft in Markdown (return as plain text, no code fences).',
      'Align with the mode description and brand guidelines.',
    ],
  },

  dispatch_essay: {
    description:
      'Longer-form editorial piece for Tonka Dispatch: reflective, grounded, steel-first.',
    headWriterInstructions: [
      'Write as a thoughtful operator who has seen years of deals and mistakes.',
      'Prioritize clarity, honesty, and specific concrete examples.',
      'Weave in narrative beats, but keep the core as a grounded essay.',
    ],
    label: 'Tonka Dispatch essay',
    structureHints: [
      'Hook with a real-feeling situation or observation.',
      'Unpack the tension, stakes, or misconception.',
      'Offer a grounded perspective and walk through the logic.',
      'End with a simple, practical takeaway the reader can act on.',
    ],
  },

  future_story_arc: {
    description:
      'Outline future story beats or episodes, not a full draft. Focus on arcs, stakes, and evolving tension.',
    headWriterInstructions: [
      'Do NOT write full prose; focus on beats and arcs.',
      'Show how stakes escalate over time.',
      'Map character or concept evolution across installments.',
      'Highlight key reveals, twists, or turning points.',
    ],
    label: 'Future story arc',
    structureHints: [
      'Act I: setup beats and inciting incident.',
      'Act II: complications, reversals, and rising stakes.',
      'Act III: major confrontation or payoff.',
      'Loose notes on sequels or follow-up arcs.',
    ],
  },

  mixed_allegory: {
    description:
      'Blend a narrative allegory with clear, practical takeaways for the reader.',
    headWriterInstructions: [
      'Use the writer_panel notes as your internal outline.',
      'Tell a short, focused story that makes the lesson obvious without being preachy.',
      'Explicitly tie the allegory back to the real-world situation in plain language.',
    ],
    label: 'Mixed allegory (story + practical lesson)',
    structureHints: [
      'Open with tension or risk.',
      'Show investigation / inspection phase.',
      'Reveal the turning point where wisdom beats impulse.',
      'End with a clear, memorable takeaway.',
    ],
    taskLines: [
      'Use the writer_panel as your internal outline and weighting guide.',
      'Write a single, coherent allegorical story in Markdown (return as plain text, no code fences).',
      'Make the story and the practical lesson feel inseparable, not bolted on.',
      'It is acceptable to have talking characters or narrative scenes in this mode.',
    ],
  },

  novella_chapter: {
    description:
      'Write a self-contained chapter in an ongoing narrative, with strong scene work and character focus.',
    headWriterInstructions: [
      'Stay inside the story world; no out-of-character explanation.',
      'Anchor the chapter around one central conflict or emotional beat.',
      'Use sensory detail, dialogue, and action to carry the scene.',
      'End at a natural beat that either resolves something or hooks the next chapter.',
    ],
    label: 'Novella chapter',
    structureHints: [
      'Opening situation or scene anchor.',
      'Rising tension and complication.',
      'Climax or emotional turning point.',
      'Aftermath and a light hook toward what comes next.',
    ],
  },

  reference_doc: {
    description:
      'Produce a structured reference document that explains a topic clearly and can be reused as a source.',
    headWriterInstructions: [
      'Organize content with clear headings and subheadings.',
      'Use bullet points, tables, or lists where it helps clarity.',
      'Define key terms and avoid unexplained jargon.',
      'Prioritize accuracy, neutrality, and reusability over style.',
    ],
    label: 'Reference document',
    structureHints: [
      'Short overview / purpose.',
      'Definitions / key concepts.',
      'Core sections with clear headings.',
      'Edge cases, caveats, or FAQs.',
      'Summary or quick reference at the end.',
    ],
  },

  screenplay: {
    description:
      'Write a script-like scene with character dialogue and minimal but clear action lines.',
    headWriterInstructions: [
      'Focus on dialogue and visible action, not internal monologue.',
      'Format in a screenplay-like style (CHARACTER NAME + dialogue, sparse action lines).',
      'Keep descriptions tight and filmable.',
      'Let conflict and subtext drive the scene.',
    ],
    label: 'Screenplay-style scene',
    structureHints: [
      'Slugline or clear indication of setting (even if informal).',
      'Establish who is present and what they want.',
      'Build tension through dialogue and action.',
      'Resolve or pivot the scene with a clear beat at the end.',
    ],
  },

  social_post: {
    description:
      'Short-form content for platforms like X, Facebook, LinkedIn, or Instagram captions.',
    headWriterInstructions: [
      'Be concise and punchy; assume short attention spans.',
      'Lead with the hook or outcome, not the backstory.',
      'Use line breaks and spacing to make it skimmable.',
      'End with a soft CTA or thought that invites response when appropriate.',
    ],
    label: 'Social post',
    structureHints: [
      'Hook line or bold statement.',
      '1–3 short lines that add context or value.',
      'Optional link or CTA.',
      'Keep total length in a “scroll-stopping but not exhausting” range.',
    ],
  },

  story_prompts: {
    description:
      'Generate multiple prompts or seeds, not a full story. These are starting points for future writing.',
    headWriterInstructions: [
      'Do NOT write full scenes or prose.',
      'Produce a list of prompts, each 1–3 sentences long.',
      'Vary tone, stakes, and perspective so they don’t all feel the same.',
      'Align prompts with the brand voice and audience when relevant.',
    ],
    label: 'Story prompts',
    structureHints: [
      '5–10 distinct prompts.',
      'Each prompt should imply conflict or mystery.',
      'Mix character-driven and situation-driven prompts.',
    ],
  },

  straight_ad: {
    description:
      'Direct, conversion-focused copy that clearly presents an offer, benefits, and next steps.',
    headWriterInstructions: [
      'Lead with the most relevant benefit or outcome.',
      'State the offer, price/terms (if provided), and who it is for.',
      'Use clear, concrete language—no vague hype.',
      'End with a specific, reasonable call to action.',
    ],
    label: 'Straight ad / offer copy',
    structureHints: [
      'Headline or strong opening line.',
      '1–3 short paragraphs or bullet lists with benefits and key details.',
      'Credibility or risk-reducer (experience, guarantees, track record if available).',
      'Clear CTA (what to do next).',
    ],
  },

  visual_prompts: {
    description:
      'Generate detailed visual descriptions that can be used for image or video generation prompts.',
    headWriterInstructions: [
      'Describe what should be visible: setting, subjects, mood, and key details.',
      'Mention style, lighting, and composition when useful.',
      'Avoid long narrative; think in snapshots or shots.',
      'Keep each prompt self-contained and unambiguous.',
    ],
    label: 'Visual prompts (image / video)',
    structureHints: [
      'Short title or label for each visual.',
      '1–3 sentences describing the scene.',
      'Optional extra line for style notes (e.g., “cinematic, high contrast, dusk”).',
    ],
  },
};

export function getProjectModeProfile(modeKey) {
  return PROJECT_MODE_CONFIGS[modeKey] || PROJECT_MODE_CONFIGS.default_mode;
}

// ----------------------------------------------------------------------------
// Build the head_writer_system_message string from the brand + mode profile.
// Ported from the n8n "Apply Project Mode Profile" code node verbatim.
// ----------------------------------------------------------------------------

export function buildHeadWriterSystemMessage({
  audience,
  brandMeta,
  modeKey,
  modeProfile,
  sliders,
  storySeed,
  writerPanel,
}) {
  const brandBlock = brandMeta
    ? [
        `Brand: ${brandMeta.name || brandMeta.slug || 'Unknown'}`,
        brandMeta.tagline ? `Tagline: ${brandMeta.tagline}` : '',
        brandMeta.voice ? `Voice: ${brandMeta.voice}` : '',
        '',
        'Brand guidelines:',
        ...(brandMeta.guidelines?.do?.length
          ? ['Do:', ...brandMeta.guidelines.do.map(d => `- ${d}`)]
          : []),
        ...(brandMeta.guidelines?.dont?.length
          ? ['Don’t:', ...brandMeta.guidelines.dont.map(d => `- ${d}`)]
          : []),
        '',
      ].filter(Boolean)
    : [];

  const sliderBlock = [
    'Creative sliders:',
    `- fact_to_fiction: ${sliders.fact_to_fiction ?? 'n/a'}`,
    `- creativity_to_reporter: ${sliders.creativity_to_reporter ?? 'n/a'}`,
    `- tone_strictness: ${sliders.tone_strictness ?? 'n/a'}`,
    `- length: ${sliders.length ?? 'n/a'}`,
    '',
  ];

  const writerPanelSummary = [
    'Writer panel (roles + weighted notes):',
    JSON.stringify(writerPanel || [], null, 2),
    '',
  ];

  const modeBlock = [
    `Project mode: ${modeProfile.label} (${modeKey})`,
    '',
    'Mode description:',
    modeProfile.description,
    '',
    'Head Writer instructions:',
    ...(modeProfile.headWriterInstructions || []).map(i => `- ${i}`),
    '',
    'Structural hints (not strict, but preferred):',
    ...(modeProfile.structureHints || []).map(s => `- ${s}`),
    '',
  ];

  const defaultTaskLines = [
    'Use the writer_panel as your internal outline and weighting guide.',
    'Write a single, coherent draft in Markdown (return as plain text, no code fences).',
    'Align with the project_mode description and brand guidelines above.',
  ];

  const taskLines =
    Array.isArray(modeProfile.taskLines) && modeProfile.taskLines.length
      ? modeProfile.taskLines
      : defaultTaskLines;

  const taskBlock = ['Task:', ...taskLines.map(line => `- ${line}`)];

  return [
    'You are the HEAD WRITER in a multi-writer room.',
    '',
    `Story seed: ${storySeed}`,
    audience ? `Target audience: ${audience}` : '',
    '',
    ...brandBlock,
    ...sliderBlock,
    ...writerPanelSummary,
    ...modeBlock,
    ...taskBlock,
  ].join('\n');
}
