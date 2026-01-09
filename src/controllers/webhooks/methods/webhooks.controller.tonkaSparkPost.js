// ----------------------------------------------------------------------------
// POST /webhooks/tonka-spark-post
// Tonka Spark Post webhook handler
// Receives validated content from n8n automation and sends notification email
// ----------------------------------------------------------------------------

import crypto from 'crypto';

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
    logger.info('Request metadata', {
      body_is_array: Array.isArray(req.body),
      body_size_bytes: JSON.stringify(req.body).length,
      content_type: req.get('content-type'),
      method: req.method,
      request_id: req.id,
      timestamp: new Date().toISOString(),
      url: req.url,
    });
    logger.info('Full request body', { body: req.body });

    // n8n may send data as array [{}] or direct object {}
    let content = req.body;
    if (Array.isArray(content)) {
      logger.info('→ Payload is array, extracting first item', {
        array_length: content.length,
      });
      content = content[0];
    }

    if (!content || typeof content !== 'object') {
      logger.error('✗ Invalid payload format', {
        content,
        type: typeof content,
      });
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid payload format'
      );
    }

    logger.info('→ Payload validated', {
      content_type: typeof content,
      has_keys: Object.keys(content).length,
      top_level_keys: Object.keys(content).slice(0, 10).join(', '),
    });

    // Check if n8n sent an error object
    if (content.error) {
      logger.error('⚠️  Tonka Spark Post workflow error received from n8n', {
        error_code: content.error.code,
        error_message: content.error.message,
        error_name: content.error.name,
        error_status: content.error.status,
        full_error: JSON.stringify(content.error, null, 2),
        has_final_draft: !!content.final_draft,
        project_brand: content.project?.brand,
        project_mode: content.project_mode,
      });
      logger.info('→ Returning acknowledgment without saving to database');
      return res.status(200).json({
        message: 'Workflow error acknowledged',
        status: 'error_received',
      });
    }

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📊 CONTENT STRUCTURE ANALYSIS', {
      brand: content.project?.brand || 'UNKNOWN',
      mode: content.project_mode || 'UNKNOWN',
      notifier_email: content.notifier_email || 'MISSING',
      send_email: content.send_email || false,
      title: content.final_draft?.title || 'NO TITLE',
    });
    logger.info('Content sections present:', {
      creative: !!content.creative,
      final_draft: !!content.final_draft,
      future_story_arcs: !!content.future_story_arc_generator?.arcs?.length,
      outputs: !!content.outputs,
      platform_summaries: !!content.platform_summaries,
      research: !!content.research,
      visual_prompts: !!content.visual_prompts?.length,
      writer_notes: !!content.writer_notes,
      writer_panel: !!content.writer_panel?.length,
    });

    if (content.final_draft) {
      logger.info('Final draft details:', {
        has_markdown: !!content.final_draft.draft_markdown,
        has_summary: !!content.final_draft.summary,
        markdown_length: content.final_draft.draft_markdown?.length || 0,
        role: content.final_draft.role || 'NONE',
      });
    }

    if (content.outputs) {
      logger.info('Outputs details:', {
        gdocs_folder_id: content.outputs.gdocs_folder_id || 'NONE',
        gdocs_link: content.outputs.gdocs_folder_id
          ? `https://drive.google.com/drive/folders/${content.outputs.gdocs_folder_id}`
          : 'NONE',
        has_gdocs_folder: !!content.outputs.gdocs_folder_id,
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

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('💾 Creating database document...');
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
      notifier_email: content.notifier_email || 'stephen@tonkaintl.com',
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
      send_email: content.send_email !== undefined ? content.send_email : false,
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

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('✓ DATABASE SAVE SUCCESSFUL', {
      brand: content.project?.brand,
      collection: 'tonka_spark_posts',
      created_at: contentDocument.created_at.toISOString(),
      document_id: contentDocument._id.toString(),
      mode: content.project_mode,
      status: contentDocument.status,
      title: content.final_draft?.title,
    });

    // ------------------------------------------------------------------------
    // SEND EMAIL NOTIFICATION
    // ------------------------------------------------------------------------
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📧 EMAIL NOTIFICATION CHECK');
    if (content.send_email && content.notifier_email) {
      logger.info('→ Email notification enabled', {
        notifier_email: content.notifier_email,
        send_email: true,
      });

      let doc_link = null;
      if (content.outputs?.gdocs_folder_id) {
        doc_link = `https://drive.google.com/drive/folders/${content.outputs.gdocs_folder_id}`;
        logger.info('→ Google Drive folder link found', {
          folder_id: content.outputs.gdocs_folder_id,
          link: doc_link,
        });
      } else {
        logger.info('→ No Google Drive folder ID in outputs');
      }

      const emailSubject =
        WRITERS_ROOM_EMAIL_TEMPLATES.CONTENT_NOTIFICATION.SUBJECT({
          brand: content.project?.brand_meta?.name || content.project?.brand,
          title: content.final_draft?.title,
        });

      logger.info('→ Email subject generated', {
        subject: emailSubject,
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

      logger.info('→ Email body generated', {
        body_length: emailBody.length,
      });

      logger.info('→ Calling email service...', {
        has_gdocs_link: !!doc_link,
        subject: emailSubject,
        to: content.notifier_email,
      });

      await emailService.sendEmail({
        htmlBody: emailBody,
        subject: emailSubject,
        to: content.notifier_email,
      });

      logger.info('✓ Email sent successfully via email service');

      logger.info('→ Updating document status to SENT...');
      contentDocument.status = CONTENT_STATUS.SENT;
      contentDocument.email_sent_at = new Date();
      await contentDocument.save();

      logger.info('✓ Document status updated', {
        document_id: contentDocument._id.toString(),
        email_sent_at: contentDocument.email_sent_at.toISOString(),
        new_status: CONTENT_STATUS.SENT,
        old_status: CONTENT_STATUS.DRAFT,
      });
    } else {
      logger.info('⊘ Email notification SKIPPED', {
        has_notifier_email: !!content.notifier_email,
        notifier_email: content.notifier_email || 'NONE',
        reason: !content.send_email
          ? 'send_email is false or missing'
          : !content.notifier_email
            ? 'notifier_email is missing'
            : 'Unknown reason',
        send_email: content.send_email || false,
      });
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('✅ WEBHOOK PROCESSING COMPLETE', {
      document_id: contentDocument._id.toString(),
      email_sent: contentDocument.status === CONTENT_STATUS.SENT,
      processing_time_ms: processingTime,
      processing_time_sec: (processingTime / 1000).toFixed(2),
      status: contentDocument.status,
      timestamp: new Date().toISOString(),
    });
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return res.status(200).json({
      documentId: contentDocument._id.toString(),
      notifier_email: content.notifier_email,
      status: contentDocument.status,
    });
  } catch (error) {
    console.log('WEBHOOK ERROR:', error);
    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.error('❌ WEBHOOK PROCESSING FAILED', {
      error_code: error.code || 'UNKNOWN',
      error_message: error.message,
      error_name: error.name,
      request_id: req.id,
      timestamp: new Date().toISOString(),
    });
    logger.error('Stack trace:', error.stack);
    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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
