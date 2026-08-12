// ----------------------------------------------------------------------------
// Social Media Director — port of n8n "Social Media Director (OpenAI)".
//
// Packages the final draft for distribution: 5 title variations + per-
// platform summaries (youtube, linkedin, x, meta, tonkaintl). Does NOT
// change the final_draft text.
//
// "Does NOT change" is enforced HERE, not asked for in the prompt. The ported
// n8n schema REQUIRED the model to echo the whole final_draft back, and this
// node took that copy over the editor's. That made a ~4k-char verbatim
// transcription part of every run — and gpt-4.1-mini does not transcribe 4k
// chars perfectly. When it slipped, it slipped on the non-ASCII punctuation,
// and the mangled copy is what got published. Five runs are on record, in two
// different shapes:
//
//   2026-05-26/28, 06-01  high byte dropped — U+2014 -> U+0014, U+2013 ->
//                         U+0013, curly quotes -> U+0018/19/1C/1D
//   2026-06-15            transcribed to literal ASCII — U+2011 AND U+2019
//                         both -> "AD" ("last-minute" -> "lastADminute",
//                         "truck's" -> "truckADs"), em dash -> "ADAD",
//                         en dash -> dropped ("1-5" -> "15")
//
// Every one of them is clean in snapshots.final_draft (written one node
// earlier, after finalEditor) and corrupted in final_payload, which is what
// pins the damage to this node rather than to the LLM boundary, Mongo, or the
// serializer. sanitizeControlChars.js was added for the first shape and works,
// but it repairs the symptom at the LLM boundary — so when the same slip came
// back in a shape its REMAP table doesn't cover ("AD"), it sailed through.
//
// The root fix is to stop copying: the prompt no longer asks for final_draft
// (see prompts/socialMediaDirector/schema.json) and ctx.final_draft is passed
// straight through regardless of what comes back.
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
  // pipeline state as input_json so the LLM can pick what it needs. The draft
  // still goes IN (it's the thing being summarized); it just never comes back.
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
    // Deliberately NOT parsed.final_draft — see the header note. Older prompt
    // versions still echo one back; it is ignored.
    final_draft: ctx.final_draft,
  };
}

// n8n "Set Default Blog Post Generator" — used when outputs.blog_post is false.
export function defaultBlogPost(ctx) {
  return {
    ...ctx,
    blog_post_package: EMPTY_BLOG_POST.format_blog_post_generator,
  };
}
