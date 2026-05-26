// ----------------------------------------------------------------------------
// Project Mode + Creative Sliders setters — collapses two n8n Set nodes
// (Project Mode Setter, Creative Sliders Setter) into one step that lifts
// nested input fields to the flat shape every LLM prompt expects.
//
// After this runs, context has:
//   project.{ mode, brand, audience }
//   creative.{ fact_to_fiction, creativity_to_reporter, tone_strictness, length }
// ----------------------------------------------------------------------------

export function projectMode(ctx) {
  return {
    ...ctx,
    creative: {
      creativity_to_reporter: ctx.sliders?.creativity_to_reporter ?? 50,
      fact_to_fiction: ctx.sliders?.fact_to_fiction ?? 50,
      length: ctx.draft?.length ?? 'short',
      tone_strictness: ctx.sliders?.tone_strictness ?? 50,
    },
    project: {
      audience: ctx.target_audience || '',
      brand: ctx.target_brand || '',
      mode: ctx.project_mode || '',
    },
  };
}
