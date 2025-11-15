// ----------------------------------------------------------------------------
// POST /webhooks/writers-room/ads
// Writers Room ad copy webhook handler
// Receives validated ad copy from n8n automation and sends notification email
// ----------------------------------------------------------------------------

import { WRITERS_ROOM_EMAIL_TEMPLATES } from '../../../constants/emailTemplates.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { AD_STATUS } from '../../../constants/writersroom.js';
import WritersRoomAds from '../../../models/writersRoomAds.model.js';
import { emailService } from '../../../services/email.service.js';
import { logger } from '../../../utils/logger.js';

export const handleWritersRoomAds = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // LOG INCOMING PAYLOAD
    // ------------------------------------------------------------------------
    logger.info('Writers Room ad webhook received', {
      body: req.body,
    });

    const ad = req.body;
    logger.info(`Request body: ${JSON.stringify(ad)}`);

    // ------------------------------------------------------------------------
    // VALIDATE REQUIRED FIELDS
    // ------------------------------------------------------------------------
    if (!ad.ad_id) {
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Missing required field: ad_id',
        400
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    if (!ad.notifier_email) {
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

    // ------------------------------------------------------------------------
    // SAVE AD TO DATABASE
    // ------------------------------------------------------------------------
    const adDocument = await WritersRoomAds.findOneAndUpdate(
      { ad_id: ad.ad_id },
      {
        ad_id: ad.ad_id,
        condition: ad.condition || null,
        copy: ad.copy || '',
        copy_length: ad.copy_length || null,
        date: ad.date || null,
        end_phrase: ad.end_phrase || null,
        exw: ad.exw || null,
        headline: ad.headline || null,
        hook: ad.hook || null,
        is_pass: ad.is_pass !== undefined ? ad.is_pass : true,
        issues: ad.issues || [],
        issues_guard: ad.issues_guard || [],
        manufacturer: ad.manufacturer || null,
        notifier_email: ad.notifier_email,
        photos: ad.photos || null,
        platform_targets: ad.platform_targets || [],
        post_proposals: ad.post_proposals
          ? {
              instagram: {
                hashtags: ad.post_proposals.instagram?.hashtags || [],
                text: ad.post_proposals.instagram?.text || null,
              },
              linkedin: {
                hashtags: ad.post_proposals.linkedin?.hashtags || [],
                text: ad.post_proposals.linkedin?.text || null,
              },
              meta: {
                hashtags: ad.post_proposals.meta?.hashtags || [],
                text: ad.post_proposals.meta?.text || null,
              },
              tiktok: {
                hashtags: ad.post_proposals.tiktok?.hashtags || [],
                text: ad.post_proposals.tiktok?.text || null,
              },
              x: {
                hashtags: ad.post_proposals.x?.hashtags || [],
                text: ad.post_proposals.x?.text || null,
              },
            }
          : null,
        price_usd: ad.price_usd || null,
        pronunciation: ad.pronunciation
          ? JSON.stringify(ad.pronunciation)
          : null,
        quantity: ad.quantity || null,
        rules: ad.rules || {},
        send_email: ad.send_email !== undefined ? ad.send_email : false,
        slate: ad.slate || null,
        specs: ad.specs || null,
        status: AD_STATUS.DRAFT,
        stock_number: ad.stock_number ? String(ad.stock_number) : null,
        subject: ad.subject || null,
        tagline: ad.tagline || null,
        tone_variant: ad.tone_variant || null,
        type: ad.type || null,
        updated_at: new Date(),
        use_hashtags: ad.use_hashtags !== undefined ? ad.use_hashtags : false,
        vo_15_adj: ad.vo_15_adj || null,
        vo_30_adj: ad.vo_30_adj || null,
        voiceover_enabled:
          ad.voiceover_enabled !== undefined ? ad.voiceover_enabled : false,
      },
      {
        new: true,
        upsert: true,
      }
    );

    logger.info('Writers Room ad saved to database', {
      ad_id: ad.ad_id,
      documentId: adDocument._id,
    });

    // ------------------------------------------------------------------------
    // SEND EMAIL NOTIFICATION
    // ------------------------------------------------------------------------
    if (ad.send_email && ad.notifier_email) {
      const emailSubject = WRITERS_ROOM_EMAIL_TEMPLATES.AD_NOTIFICATION.SUBJECT(
        {
          subject: ad.subject,
        }
      );

      const emailBody = WRITERS_ROOM_EMAIL_TEMPLATES.AD_NOTIFICATION.BODY({
        ad_id: ad.ad_id,
        condition: ad.condition,
        copy: ad.copy,
        date: ad.date,
        end_phrase: ad.end_phrase,
        exw: ad.exw,
        headline: ad.headline,
        hook: ad.hook,
        is_pass: ad.is_pass,
        issues: ad.issues,
        issues_guard: ad.issues_guard,
        platform_targets: ad.platform_targets,
        price_usd: ad.price_usd,
        specs: ad.specs,
        stock_number: ad.stock_number,
        subject: ad.subject,
        tagline: ad.tagline,
        timestamp: new Date(),
        tone_variant: ad.tone_variant,
      });

      await emailService.sendEmail({
        htmlBody: emailBody,
        subject: emailSubject,
        to: ad.notifier_email,
      });
    }

    // ------------------------------------------------------------------------
    // UPDATE AD STATUS AFTER EMAIL SENT
    // ------------------------------------------------------------------------
    await WritersRoomAds.findOneAndUpdate(
      { ad_id: ad.ad_id },
      {
        email_sent_at: new Date(),
        status: AD_STATUS.SENT,
        updated_at: new Date(),
      }
    );

    logger.info('Writers Room ad notification sent', {
      ad_id: ad.ad_id,
      notifier_email: ad.notifier_email,
    });

    // ------------------------------------------------------------------------
    // RETURN SUCCESS RESPONSE
    // ------------------------------------------------------------------------
    return res.status(200).json({
      ad_id: ad.ad_id,
      documentId: adDocument._id.toString(),
      notifier_email: ad.notifier_email,
      status: 'sent',
    });
  } catch (error) {
    console.error('=== WEBHOOK ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Full error:', error);
    console.error('===================');

    logger.error('Writers Room ads webhook processing failed', {
      ad_id: req.body?.ad_id,
      error: error.message,
      stack: error.stack,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Internal server error processing Writers Room ads webhook'
    );
    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      status: 'error',
    });
  }
};
