// ----------------------------------------------------------------------------
// Tonka Spark Post — shared save+notify service.
//
// Used by both:
//   1. POST /api/webhooks/tonka-spark-post  (n8n / external callers — kept
//      for backwards compatibility while the n8n flow is retired)
//   2. The Writers Room orchestrator, in-process, as the last step of a
//      successful run
//
// Both paths produce a TonkaSparkPosts document and (when
// TONKA_SPARK_SEND_EMAIL is true) fire the notification email.
// ----------------------------------------------------------------------------

import crypto from 'crypto';

import { config } from '../config/env.js';
import { WRITERS_ROOM_EMAIL_TEMPLATES } from '../constants/emailTemplates.js';
import { CONTENT_STATUS } from '../constants/writersroom.js';
import TonkaSparkPosts from '../models/tonkaSparkPost.model.js';
import { logger } from '../utils/logger.js';

import { emailService } from './email.service.js';

// Normalize visual_prompts so every entry has an id (required by the
// image upload endpoint downstream).
function normalizeVisualPrompts(prompts) {
  if (!Array.isArray(prompts)) return [];
  return prompts.map((prompt, index) => ({
    ...prompt,
    id: prompt.id || `vp-${String(index + 1).padStart(2, '0')}`,
  }));
}

// Save the spark post + send notification email if enabled. Returns the
// saved document. Throws on validation/db error so the caller (orchestrator
// or webhook) can decide how to surface it.
//
// `content` is the same shape the n8n webhook used to receive, which is
// also what finalDispatch now produces — keeping both producers aligned
// means we can ship a unified record.
export async function saveTonkaSparkPost(content, options = {}) {
  const { sendEmail = config.TONKA_SPARK_SEND_EMAIL, source = 'unknown' } =
    options;

  const contentId = content.content_id || crypto.randomUUID();

  const contentDocument = await TonkaSparkPosts.create({
    content_id: contentId,
    creative: content.creative || null,
    final_draft: content.final_draft
      ? {
          draft_markdown: content.final_draft.draft_markdown || null,
          role: content.final_draft.role || null,
          summary: content.final_draft.summary || null,
          thesis: content.final_draft.thesis || null,
          title: content.final_draft.title || null,
        }
      : null,
    future_story_arc_generator: content.future_story_arc_generator
      ? {
          arcs:
            content.future_story_arc_generator.arcs?.map(arc => ({
              arc_title: arc.arc_title || null,
              one_line_premise: arc.one_line_premise || null,
              suggested_story_seed: arc.suggested_story_seed || null,
              why_it_matters: arc.why_it_matters || null,
            })) || [],
        }
      : null,
    head_writer_system_message: content.head_writer_system_message || null,
    notifier_email: content.notifier_email || config.TONKA_SPARK_RECIPIENTS,
    outputs: content.outputs || null,
    platform_summaries: content.platform_summaries || null,
    project: content.project
      ? {
          audience: content.project.audience || null,
          brand: content.project.brand || null,
          brand_meta: content.project.brand_meta || null,
          mode: content.project.mode || null,
        }
      : null,
    project_mode: content.project_mode || null,
    project_mode_profile: content.project_mode_profile || null,
    research: content.research || null,
    send_email: sendEmail,
    status: CONTENT_STATUS.DRAFT,
    story_seed: content.story_seed || null,
    target_audience: content.target_audience || null,
    target_brand: content.target_brand || null,
    title_variations: content.title_variations || [],
    tokens: content.tokens || null,
    visual_prompts: normalizeVisualPrompts(content.visual_prompts),
    writer_notes: content.writer_notes || null,
    writer_panel: content.writer_panel || [],
    writers: content.writers || null,
  });

  logger.info('[TonkaSparkPost] Document saved', {
    document_id: contentDocument._id.toString(),
    source,
    title: content.final_draft?.title,
  });

  if (sendEmail) {
    try {
      let docLink = null;
      if (content.outputs?.gdocs_folder_id) {
        docLink = `https://drive.google.com/drive/folders/${content.outputs.gdocs_folder_id}`;
      }

      const emailSubject =
        WRITERS_ROOM_EMAIL_TEMPLATES.CONTENT_NOTIFICATION.SUBJECT({
          title: content.final_draft?.title,
        });

      const emailBody = WRITERS_ROOM_EMAIL_TEMPLATES.CONTENT_NOTIFICATION.BODY({
        doc_link: docLink,
        final_draft: content.final_draft,
        future_story_arc_generator: content.future_story_arc_generator,
        outputs: content.outputs,
        platform_summaries: content.platform_summaries,
        research: content.research,
        spark_post_id: contentDocument._id?.toString(),
        timestamp: new Date(),
        title_variations: content.title_variations,
        visual_prompts: content.visual_prompts,
        writer_notes: content.writer_notes,
      });

      await emailService.sendEmail({
        htmlBody: emailBody,
        subject: emailSubject,
        to: contentDocument.notifier_email.split(',').map(e => e.trim()),
      });

      contentDocument.status = CONTENT_STATUS.SENT;
      contentDocument.email_sent_at = new Date();
      await contentDocument.save();

      logger.info('[TonkaSparkPost] Notification email sent', {
        document_id: contentDocument._id.toString(),
        to: contentDocument.notifier_email,
      });
    } catch (emailErr) {
      // Email failure shouldn't lose the saved document. Log and move on;
      // the doc is already persisted with status: DRAFT.
      logger.error('[TonkaSparkPost] Notification email failed', {
        document_id: contentDocument._id.toString(),
        error: emailErr.message,
      });
    }
  }

  return contentDocument;
}
