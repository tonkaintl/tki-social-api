// ----------------------------------------------------------------------------
// Final Dispatch — produces the canonical payload that gets:
//   1. returned to the caller from POST /api/writers-room/run
//   2. saved to tonka_spark_posts via saveTonkaSparkPost()
//   3. persisted on the WritersRoomRun record as final_payload
//
// Shape matches what the tonka_spark_posts model + email template expect,
// so the orchestrator can forward in-process without any further mapping.
// (The n8n flow used to POST this same shape to /api/webhooks/tonka-spark-post;
// keeping parity means the existing webhook + email pipeline still works.)
// ----------------------------------------------------------------------------

export function finalDispatch(ctx) {
  const finalDraft = ctx.final_draft || {};
  const blogPackage = ctx.blog_post_package || {};

  return {
    creative: ctx.creative || null,
    final_draft: {
      draft_markdown: finalDraft.draft_markdown || finalDraft.story || '',
      role: finalDraft.role || 'final_editor',
      summary: finalDraft.summary || '',
      thesis: finalDraft.thesis || '',
      title: finalDraft.title || '',
    },
    future_story_arc_generator: {
      arcs: ctx.future_arcs || [],
    },
    head_writer_system_message: ctx.head_writer_system_message || null,
    notifier_email: ctx.notifier_email || null,
    outputs: ctx.outputs || null,
    platform_summaries: blogPackage.platform_summaries || null,
    // Surface the head writer's pre-edit draft so we can compare against
    // the final edited version when mining a run for "the editor lost
    // something good" cases.
    pre_edit_head_draft: ctx.head_draft || null,
    project: ctx.project
      ? {
          audience: ctx.project.audience || null,
          brand: ctx.project.brand || null,
          brand_meta: ctx.project.brand_meta || null,
          mode: ctx.project.mode || null,
        }
      : null,
    project_mode: ctx.project_mode || null,
    project_mode_profile: ctx.project_mode_profile || null,
    research: {
      citations: ctx.research?.citations || [],
      enable_research: !!ctx.research?.enable_research,
      facts: ctx.research?.facts || null,
      findings: ctx.research?.findings || [],
      topics_covered: ctx.research?.topics_covered || [],
    },
    story_seed: ctx.story_seed || '',
    target_audience: ctx.project?.audience || ctx.target_audience || '',
    target_brand: ctx.target_brand || null,
    title_variations: blogPackage.title_variations || [],
    visual_prompts: ctx.visual_prompts || [],
    writer_notes: ctx.writer_notes || null,
    writer_panel: ctx.writer_panel || [],
    writers: ctx.writers || null,
  };
}
