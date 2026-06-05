// ----------------------------------------------------------------------------
// Social Media Director — port of n8n "Social Media Director (OpenAI)".
//
// Packages the final draft for distribution: 5 title variations + per-
// platform summaries (youtube, linkedin, x, meta, tonkaintl). Does NOT
// change the final_draft text.
// ----------------------------------------------------------------------------

import { extractJson } from '../llm/extractJson.js';
import { callLlmFromPrompt } from '../llm/index.js';

const SLUG = 'socialMediaDirector';

const EMPTY_BLOG_POST = {
  format_blog_post_generator: {
    platform_summaries: {
      linkedin: '',
      meta: '',
      tonkaintl: '',
      x: '',
      youtube: '',
    },
    title_variations: [],
  },
};

function buildSocialMediaContext(ctx) {
  // n8n's prompt expected {{ JSON.stringify($json) }} — pass the whole
  // pipeline state as input_json so the LLM can pick what it needs.
  return {
    ...ctx,
    input_json: JSON.stringify(
      { final_draft: ctx.final_draft, project: ctx.project },
      null,
      2
    ),
  };
}

export async function socialMediaDirector(ctx) {
  const enriched = buildSocialMediaContext(ctx);
  const result = await callLlmFromPrompt(SLUG, enriched);
  const parsed = typeof result === 'string' ? extractJson(result) : result;
  return {
    ...ctx,
    blog_post_package:
      parsed?.format_blog_post_generator ||
      EMPTY_BLOG_POST.format_blog_post_generator,
    final_draft: parsed?.final_draft || ctx.final_draft,
  };
}

// n8n "Set Default Blog Post Generator" — used when outputs.blog_post is false.
export function defaultBlogPost(ctx) {
  return {
    ...ctx,
    blog_post_package: EMPTY_BLOG_POST.format_blog_post_generator,
  };
}
