// ----------------------------------------------------------------------------
// Decision helpers — replace the n8n IF nodes (Writer Comedy Gate,
// Writer Historic Gate, ..., If Blog Post, If Visual Prompts, If Story Arc,
// If Notes gDoc, If Final gDoc).
//
// All gates collapse to: "should this branch run for this context?"
// Keeping them as small named functions makes the orchestrator readable
// and lets us test each gate independently.
// ----------------------------------------------------------------------------

export function isWriterEnabled(ctx, role) {
  return Boolean(ctx?.writers?.[role]?.enabled);
}

export function isResearchEnabled(ctx) {
  return Boolean(ctx?.research?.enable_research);
}

export function shouldGenerateBlogPost(ctx) {
  return Boolean(ctx?.outputs?.blog_post);
}

export function shouldGenerateVisualPrompts(ctx) {
  return Boolean(ctx?.outputs?.visual_prompts);
}

export function shouldGenerateFutureStoryArc(ctx) {
  return Boolean(ctx?.outputs?.future_story_arc);
}

export function shouldExportToGdocs(ctx) {
  // n8n flow only ran gDocs nodes when a folder id was provided.
  // gDocs export is out of v1 scope; this still lets the controller report
  // whether the input asked for it.
  return Boolean(ctx?.outputs?.gdocs_folder_id);
}

// Generic helper for the orchestrator's branch list — returns the writer
// roles that the Genre Tone Router enabled.
export function activeWriterRoles(ctx) {
  const writers = ctx?.writers || {};
  return Object.keys(writers).filter(role => writers[role]?.enabled);
}
