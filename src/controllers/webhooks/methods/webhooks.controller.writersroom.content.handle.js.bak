// ----------------------------------------------------------------------------
// POST /webhooks/writers-room/content
// Writers Room content webhook handler
// Receives validated content from n8n automation and sends notification email
// ----------------------------------------------------------------------------

import { WRITERS_ROOM_EMAIL_TEMPLATES } from '../../../constants/emailTemplates.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { CONTENT_STATUS } from '../../../constants/writersroom.js';
import WritersRoomContent from '../../../models/writersRoomContent.model.js';
import { emailService } from '../../../services/email.service.js';
import { logger } from '../../../utils/logger.js';

export const handleWritersRoomContent = async (req, res) => {
  const startTime = Date.now();
  try {
    // ------------------------------------------------------------------------
    // LOG INCOMING PAYLOAD - DETAILED
    // ------------------------------------------------------------------------
    const content = req.body;
    const payloadSize = JSON.stringify(content).length;

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('Writers Room Content Webhook - RECEIVED', {
      content_id: content.content_id || 'not-provided',
      ip: req.ip,
      payload_size_kb: (payloadSize / 1024).toFixed(2),
      request_id: req.id,
      timestamp: new Date().toISOString(),
      user_agent: req.get('User-Agent'),
    });

    logger.info('Payload Structure:', {
      brand: content.project?.brand || 'unknown',
      creative_settings: content.creative
        ? {
            creativity_to_reporter: content.creative.creativity_to_reporter,
            fact_to_fiction: content.creative.fact_to_fiction,
            length: content.creative.length,
            tone_strictness: content.creative.tone_strictness,
          }
        : null,
      has_final_draft: !!content.final_draft,
      has_future_story_arcs:
        !!content.future_story_arc_generator?.arcs?.length,
      has_platform_summaries: !!content.platform_summaries,
      has_research: !!content.research,
      has_visual_prompts: !!content.visual_prompts?.length,
    logger.info('Saving to database...', {
      collection: 'writers_room_contents',
      content_id,
      operation: 'findOneAndUpdate',
    });

      has_writer_notes: !!content.writer_notes,
      mode: content.project_mode || 'unknown',
      notifier_email: content.notifier_email || 'missing',
      outputs: content.outputs || {},
      send_email: content.send_email,
      target_audience: content.target_audience?.substring(0, 50) + '...' || null,
      title: content.final_draft?.title || 'no-title',
      writer_panel_count: content.writer_panel?.length || 0,
    });

    // ------------------------------------------------------------------------
    // VALIDATE REQUIRED FIELDS
    // ------------------------------------------------------------------------
    // Generate content_id from timestamp and brand if not provided
    const content_id =
      content.content_id ||
      `wrc_${Date.now()}_${content.project?.brand || 'unknown'}`;

    logger.info('Content ID assigned', { content_id });

    if (!content.notifier_email) {
      logger.warn('Validation failed: Missing notifier_email', {
        content_id,
      });

      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Missing required field: notifier_email',
        400
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    logger.info('Validation passed', {
      content_id,
      notifier_email: content.notifier_email,
    });

    // ------------------------------------------------------------------------
    // SAVE CONTENT TO DATABASE
    // ------------------------------------------------------------------------
    const contentDocument = await WritersRoomContent.findOneAndUpdate(
      { content_id },
      {
        content_id,
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
        notifier_email: content.notifier_email,
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
        revision: content.revision || null,
        send_email:
          content.send_email !== undefined ? content.send_email : false,
        status: CONTENT_STATUS.DRAFT,
        story_seed: content.story_seed || null,
        target_audience: content.target_audience || null,
        target_brand: content.target_brand || null,
        title_variations: content.title_variations || [],
        tokens: content.tokens || null,
        updated_at: new Date(),
        visual_prompts: content.visual_prompts || [],
        writer_notes: content.writer_notes || null,
        writer_panel: content.writer_panel || [],
        writers: content.writers || null,
      },
      {✓ Database save successful', {
      content_id,
      document_id: contentDocument._id.toString(),
      is_new: !contentDocument.created_at,
    });

    // ------------------------------------------------------------------------
    // SEND EMAIL NOTIFICATION
    // ------------------------------------------------------------------------
    if (content.send_email && content.notifier_email) {
      logger.info('Preparing email notification...', {
        content_id,
        recipient: content.notifier_email,
      });
    });

    // ------------------------------------------------------------------------
    // SEND EMAIL NOTIFICATION
    // ------------------------------------------------------------------------
    if (content.send_email && content.notifier_email) {
      // Generate Google Drive link if gdocs_folder_id is available
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
        content_id,
        doc_link,
        final_draft: content.final_draft,
        future_story_arc_generator: content.future_story_arc_generator,
        outputs: content.outputs,
        platform_summaries: content.platform_summaries,
        project: content.project,
        research: content.research,

      logger.info('✓ Email sent successfully', {
        content_id,
        recipient: content.notifier_email,
        subject: emailSubject,
      });
    } else {
      logger.info('Email sending skipped', {
        content_id,
        reason:
          !content.send_email ? 'send_email=false' : 'no notifier_email',
      });
    }

    // ------------------------------------------------------------------------
    // UPDATE CONTENT STATUS AFTER EMAIL SENT
    // ------------------------------------------------------------------------
    logger.info('Updating status to SENT...', { content_id });


    const processingTime = Date.now() - startTime;

    logger.info('✓✓✓ Writers Room Content Webhook - COMPLETED', {
      content_id,
      document_id: contentDocument._id.toString(),
      email_sent: content.send_email && content.notifier_email,
      notifier_email: content.notifier_email,
      processing_time_ms: processingTime,
      status: 'sent',
      timestamp: new Date().toISOString(),
    });
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ------------------------------------------------------------------------
    // RETURN SUCCESS RESPONSE
    // ------------------------------------------------------------------------
    return res.status(200).json({
      content_id,
      documentId: contentDocument._id.toString(),
      notifier_email: content.notifier_email,
      status: 'sent',
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.error('✗✗✗ Writers Room Content Webhook - FAILED', {
      content_id: req.body?.content_id || 'unknown',
      error_message: error.message,
      error_name: error.name,
      processing_time_ms: processingTime,
      request_id: req.id,
      timestamp: new Date().toISOString(),
    });

    logger.error('Error details:', {
      brand: req.body?.project?.brand,
      mode: req.body?.project_mode,
      notifier_email: req.body?.notifier_email,
      stack: error.stack,
    });
    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'/ ------------------------------------------------------------------------
    return res.status(200).json({
      content_id,
      documentId: contentDocument._id.toString(),
      notifier_email: content.notifier_email,
      status: 'sent',
    });
  } catch (error) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Full error:', error);
    console.error('===================');

    logger.error('Writers Room content webhook processing failed', {
      content_id: req.body?.content_id,
      error: error.message,
      stack: error.stack,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Internal server error processing Writers Room content webhook'
    );
    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      status: 'error',
    });
  }
};
