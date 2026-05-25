// ----------------------------------------------------------------------------
// POST /api/webhooks/tonka-spark-post
//
// External entry point — kept for compatibility while the n8n flow is
// retired. Internal callers (e.g. the Writers Room orchestrator) should
// call saveTonkaSparkPost() directly instead of round-tripping HTTP.
// ----------------------------------------------------------------------------

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { saveTonkaSparkPost } from '../../../services/tonkaSparkPost.service.js';
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

    // n8n sometimes posts an error envelope instead of content — ack and exit.
    if (content.error) {
      logger.error('Tonka Spark Post workflow error received from n8n', {
        error_code: content.error.code,
        error_message: content.error.message,
      });
      return res.status(200).json({
        message: 'Workflow error acknowledged',
        status: 'error_received',
      });
    }

    const contentDocument = await saveTonkaSparkPost(content, {
      source: 'webhook',
    });

    logger.info('WEBHOOK COMPLETE', {
      document_id: contentDocument._id.toString(),
      email_sent: contentDocument.email_sent_at !== undefined,
      processing_time_ms: Date.now() - startTime,
    });

    return res.status(200).json({
      documentId: contentDocument._id.toString(),
      notifier_email: content.notifier_email,
      status: contentDocument.status,
    });
  } catch (error) {
    logger.error('WEBHOOK FAILED', {
      error: error.message,
      request_id: req.id,
      stack: error.stack,
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
