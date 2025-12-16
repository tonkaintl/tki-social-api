// ----------------------------------------------------------------------------
// POST /webhooks/writers-room/content
// Writers Room content webhook handler
// Receives validated content from n8n automation and sends notification email
// ----------------------------------------------------------------------------

import crypto from 'crypto';

import { WRITERS_ROOM_EMAIL_TEMPLATES } from '../../../constants/emailTemplates.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { CONTENT_STATUS } from '../../../constants/writersroom.js';
import WritersRoomEntries from '../../../models/writersRoomEntries.model.js';
import { emailService } from '../../../services/email.service.js';
import { logger } from '../../../utils/logger.js';

export const handleWritersRoomEntries = async (req, res) => {
  const startTime = Date.now();

  console.log('\n========================================');
  console.log('WRITERS ROOM ENTRIES WEBHOOK CALLED');
  console.log('Time:', new Date().toISOString());
  console.log('Request ID:', req.id);
  console.log(
    'Body type:',
    Array.isArray(req.body) ? 'ARRAY' : typeof req.body
  );
  console.log('Body length:', JSON.stringify(req.body).length, 'bytes');
  console.log('========================================\n');

  try {
    console.log('[STEP 1] Inside try block');
    logger.info('=== WRITERS ROOM ENTRIES WEBHOOK START ===');
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
    console.log('[STEP 2] Logger statements executed');

    // n8n may send data as array [{}] or direct object {}
    let content = req.body;
    console.log(
      '[STEP 3] Content type:',
      Array.isArray(content) ? 'Array' : typeof content
    );
    if (Array.isArray(content)) {
      console.log(
        '[STEP 4] Extracting first item from array, length:',
        content.length
      );
      logger.info('→ Payload is array, extracting first item', {
        array_length: content.length,
      });
      content = content[0];
      console.log('[STEP 5] Extracted content type:', typeof content);
    }

    if (!content || typeof content !== 'object') {
      console.log('[ERROR] Invalid payload format:', typeof content);
      logger.error('✗ Invalid payload format', {
        content,
        type: typeof content,
      });
      throw new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid payload format'
      );
    }

    console.log(
      '[STEP 6] Payload validated, keys:',
      Object.keys(content).length
    );
    console.log(
      '[STEP 7] Top-level keys:',
      Object.keys(content).slice(0, 15).join(', ')
    );
    logger.info('→ Payload validated', {
      content_type: typeof content,
      has_keys: Object.keys(content).length,
      top_level_keys: Object.keys(content).slice(0, 10).join(', '),
    });

    // Check if n8n sent an error object
    console.log('[STEP 8] Checking for error object:', !!content.error);
    if (content.error) {
      console.log('[ERROR] N8N workflow error detected:', content.error);
      logger.error('⚠️  Writers Room workflow error received from n8n', {
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
      console.log('[RETURN] Sending 200 response for error acknowledgment');
      return res.status(200).json({
        message: 'Workflow error acknowledged',
        status: 'error_received',
      });
    }
    console.log('[STEP 9] No error object, proceeding with save');

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
    console.log('[STEP 10] Starting database save operation');
    console.log(
      '[STEP 11] Brand:',
      content.project?.brand,
      'Mode:',
      content.project_mode
    );
    console.log('[STEP 12] Title:', content.final_draft?.title);

    // Generate content_id if not provided
    const contentId = content.content_id || crypto.randomUUID();
    console.log('[STEP 12.5] Generated content_id:', contentId);

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('💾 Creating database document...');
    const contentDocument = await WritersRoomEntries.create({
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
      send_email: content.send_email !== undefined ? content.send_email : false,
      status: CONTENT_STATUS.DRAFT,
      story_seed: content.story_seed || null,
      target_audience: content.target_audience || null,
      target_brand: content.target_brand || null,
      title_variations: content.title_variations || [],
      tokens: content.tokens || null,
      visual_prompts: content.visual_prompts || [],
      writer_notes: content.writer_notes || null,
      writer_panel: content.writer_panel || [],
      writers: content.writers || null,
    });

    console.log(
      '[STEP 13] Database document created, ID:',
      contentDocument._id.toString()
    );
    console.log('[STEP 14] Document status:', contentDocument.status);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('✓ DATABASE SAVE SUCCESSFUL', {
      brand: content.project?.brand,
      collection: 'writers_room_entries',
      created_at: contentDocument.created_at.toISOString(),
      document_id: contentDocument._id.toString(),
      mode: content.project_mode,
      status: contentDocument.status,
      title: content.final_draft?.title,
    });

    // ------------------------------------------------------------------------
    // SEND EMAIL NOTIFICATION
    // ------------------------------------------------------------------------
    console.log(
      '[STEP 15] Email check - send_email:',
      content.send_email,
      'notifier_email:',
      content.notifier_email
    );
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('📧 EMAIL NOTIFICATION CHECK');
    if (content.send_email && content.notifier_email) {
      console.log('[STEP 16] Email enabled, preparing to send...');
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

      console.log(
        '[STEP 17] Calling email service, to:',
        content.notifier_email
      );
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

      console.log('[STEP 18] Email sent successfully');
      logger.info('✓ Email sent successfully via email service');

      console.log('[STEP 19] Updating document status to SENT...');
      logger.info('→ Updating document status to SENT...');
      contentDocument.status = CONTENT_STATUS.SENT;
      contentDocument.email_sent_at = new Date();
      await contentDocument.save();

      console.log('[STEP 20] Document status updated to SENT');
      logger.info('✓ Document status updated', {
        document_id: contentDocument._id.toString(),
        email_sent_at: contentDocument.email_sent_at.toISOString(),
        new_status: CONTENT_STATUS.SENT,
        old_status: CONTENT_STATUS.DRAFT,
      });
    } else {
      console.log(
        '[STEP 20] Email skipped - send_email:',
        content.send_email,
        'has_email:',
        !!content.notifier_email
      );
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

    console.log('[COMPLETE] Processing time:', processingTime, 'ms');
    console.log('[COMPLETE] Document ID:', contentDocument._id.toString());
    console.log('[COMPLETE] Status:', contentDocument.status);
    console.log('[COMPLETE] Returning 200 response\n');

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
    console.log('\n[ERROR] Caught exception in webhook handler');
    console.log('[ERROR] Error name:', error.name);
    console.log('[ERROR] Error message:', error.message);
    console.log('[ERROR] Error stack:', error.stack);
    console.log('[ERROR] Request ID:', req.id);
    console.log('========================================\n');

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
      'Internal server error processing Writers Room content webhook'
    );
    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      status: 'error',
    });
  }
};
