// ----------------------------------------------------------------------------
// POST /webhooks/meta
// Meta webhook event handler
// ----------------------------------------------------------------------------

import { MetaAdapter } from '../../../adapters/meta/meta.adapter.js';
import { config } from '../../../config/env.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { binderService } from '../../../services/binder.service.js';
import { logger } from '../../../utils/logger.js';

const metaAdapter = new MetaAdapter(config);

export const handleMetaWebhook = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // LOG INCOMING EVENT
    // ------------------------------------------------------------------------
    logger.info('Meta webhook event received', {
      body: req.body,
    });

    // ------------------------------------------------------------------------
    // PROCESS WEBHOOK EVENTS (includes signature verification)
    // ------------------------------------------------------------------------
    const events = await metaAdapter.handleWebhook(req);

    // Process each event
    for (const event of events) {
      try {
        switch (event.type) {
          case 'comment':
          case 'message':
            await binderService.upsertConversation({
              authorId: event.authorId,
              authorName: event.authorName,
              content: event.content,
              externalCommentId: event.id,
              externalThreadId: event.postId,
              provider: 'meta',
              timestamp: event.timestamp,
              type: event.type,
            });
            break;

          case 'lead':
            await binderService.upsertLead({
              externalLeadId: event.id,
              provider: 'meta',
              source: 'meta_webhook',
              timestamp: event.timestamp,
            });
            break;

          default:
            logger.warn('Unknown event type received', {
              eventId: event.id,
              eventType: event.type,
            });
        }
      } catch (processingError) {
        logger.error('Failed to process Meta webhook event', {
          error: processingError.message,
          event,
        });
        // Continue processing other events even if one fails
      }
    }

    // ------------------------------------------------------------------------
    // RETURN SUCCESS
    // ------------------------------------------------------------------------
    logger.info('Meta webhook processed successfully', {
      eventCount: events.length,
    });

    return res.status(200).json({
      processed: events.length,
      status: 'success',
    });
  } catch (error) {
    logger.error('Meta webhook processing failed', {
      error: error.message,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      error.message
    );
    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      status: 'error',
    });
  }
};
