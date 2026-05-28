// ----------------------------------------------------------------------------
// pickTitle — non-LLM node that randomly promotes one of the Social Media
// Director's title_variations into final_draft.title. Runs AFTER
// socialMediaDirector (which produces blog_post_package.title_variations)
// and BEFORE finalDispatch (which reads final_draft.title into the spark-
// post payload).
//
// When the candidates pool is empty or blog post output was skipped, this
// node is a passthrough — final_draft.title keeps whatever the final editor
// picked.
//
// Snapshot side effect: writes ctx.title_pick = { chosen, candidates,
// original } so the run record shows which title shipped and what was on
// the cutting room floor.
// ----------------------------------------------------------------------------

function pickRandom(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const idx = Math.floor(Math.random() * items.length);
  return items[idx];
}

export function pickTitle(ctx) {
  const candidates = Array.isArray(ctx?.blog_post_package?.title_variations)
    ? ctx.blog_post_package.title_variations.filter(
        t => typeof t === 'string' && t.trim().length > 0
      )
    : [];

  const originalTitle = ctx?.final_draft?.title || '';
  const chosen = pickRandom(candidates);

  if (!chosen) {
    return {
      ...ctx,
      title_pick: {
        candidates: [],
        chosen: null,
        original: originalTitle,
        reason: 'no_candidates',
      },
    };
  }

  return {
    ...ctx,
    final_draft: {
      ...(ctx.final_draft || {}),
      title: chosen,
    },
    title_pick: {
      candidates,
      chosen,
      original: originalTitle,
      reason: 'random',
    },
  };
}
