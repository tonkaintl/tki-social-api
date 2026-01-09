// ----------------------------------------------------------------------------
// POST /webhooks/tonka-spark-post
// Tonka Spark Post webhook handler
// Receives validated content from n8n automation and sends notification email
// ----------------------------------------------------------------------------

import crypto from 'crypto';

import { config } from '../../../config/env.js';
import { WRITERS_ROOM_EMAIL_TEMPLATES } from '../../../constants/emailTemplates.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { CONTENT_STATUS } from '../../../constants/writersroom.js';
import TonkaSparkPosts from '../../../models/tonkaSparkPost.model.js';
import { emailService } from '../../../services/email.service.js';
import { logger } from '../../../utils/logger.js';

export const handleTonkaSparkPost = async (req, res) => {
  const startTime = Date.now();

  try {
    logger.info('=== TONKA SPARK POST WEBHOOK START ===');

    // n8n may send data as array [{}] or direct object {}
    let content = req.body;
    if (Array.isArray(content)) {
      content = content[0];
    }

    if (!content || typeof content !== 'object') {
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid payload format'
      );
    }

    // Check if n8n sent an error object
    if (content.error) {
      logger.error('⚠️  Tonka Spark Post workflow error received from n8n', {
        error_code: content.error.code,
        error_message: content.error.message,
      });
      return res.status(200).json({
        message: 'Workflow error acknowledged',
        status: 'error_received',
      });
    }

    // ------------------------------------------------------------------------
    // SAVE CONTENT TO DATABASE
    // ------------------------------------------------------------------------
    // Generate content_id if not provided
    const contentId = content.content_id || crypto.randomUUID();

    // Ensure visual prompts have IDs (required for image upload endpoint)
    const visualPrompts =
      content.visual_prompts?.map((prompt, index) => ({
        ...prompt,
        id: prompt.id || `vp-${String(index + 1).padStart(2, '0')}`,
      })) || [];

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
      notifier_email: config.TONKA_SPARK_RECIPIENTS,
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
      send_email: config.TONKA_SPARK_SEND_EMAIL,
      status: CONTENT_STATUS.DRAFT,
      story_seed: content.story_seed || null,
      target_audience: content.target_audience || null,
      target_brand: content.target_brand || null,
      title_variations: content.title_variations || [],
      tokens: content.tokens || null,
      visual_prompts: visualPrompts,
      writer_notes: content.writer_notes || null,
      writer_panel: content.writer_panel || [],
      writers: content.writers || null,
    });

    logger.info('✓ Document saved', {
      id: contentDocument._id.toString(),
      title: content.final_draft?.title,
    });

    // ------------------------------------------------------------------------
    // SEND EMAIL NOTIFICATION
    // ------------------------------------------------------------------------
    if (config.TONKA_SPARK_SEND_EMAIL) {
      let doc_link = null;
      if (content.outputs?.gdocs_folder_id) {
        doc_link = `https://drive.google.com/drive/folders/${content.outputs.gdocs_folder_id}`;
      }

      const emailSubject =
        WRITERS_ROOM_EMAIL_TEMPLATES.CONTENT_NOTIFICATION.SUBJECT({
          brand: content.project?.brand_meta?.name || content.project?.brand,
          title: content.final_draft?.title,
        });

      const emailBody = WRITERS_ROOM_EMAIL_TEMPLATES.CONTENT_NOTIFICATION.BODY({
        doc_link,
        final_draft: content.final_draft,
        future_story_arc_generator: content.future_story_arc_generator,
        outputs: content.outputs,
        platform_summaries: content.platform_summaries,
        project: content.project,
        research: content.research,
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

      logger.info('✓ Email sent to', contentDocument.notifier_email);
    }

    const endTime = Date.now();

    logger.info('✅ WEBHOOK COMPLETE', {
      document_id: contentDocument._id.toString(),
      email_sent: contentDocument.status === CONTENT_STATUS.SENT,
      processing_time_ms: endTime - startTime,
    });

    return res.status(200).json({
      documentId: contentDocument._id.toString(),
      notifier_email: content.notifier_email,
      status: contentDocument.status,
    });
  } catch (error) {
    console.log('WEBHOOK ERROR:', error);
    logger.error('❌ WEBHOOK FAILED', {
      error: error.message,
      request_id: req.id,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Internal server error processing Tonka Spark Post webhook'
    );
    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      status: 'error',
    });
  }
};
