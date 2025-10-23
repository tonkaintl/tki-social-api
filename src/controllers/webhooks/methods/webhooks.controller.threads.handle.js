// ----------------------------------------------------------------------------
// POST /webhooks/threads
// Threads webhook event handler
// ----------------------------------------------------------------------------

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { logger } from '../../../utils/logger.js';

export const handleThreadsWebhook = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // VERIFY WEBHOOK SIGNATURE (when Threads adapter is implemented)
    // ------------------------------------------------------------------------
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      logger.warn('Threads webhook missing signature header');
      const error = new ApiError(
        ERROR_CODES.MISSING_WEBHOOK_SIGNATURE,
        'Missing Threads webhook signature'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    // ------------------------------------------------------------------------
    // LOG INCOMING EVENT
    // ------------------------------------------------------------------------
    logger.info('Threads webhook event received', {
      body: req.body,
      hasSignature: !!signature,
    });

    // ------------------------------------------------------------------------
    // STUB: THREADS PROCESSING NOT IMPLEMENTED
    // ------------------------------------------------------------------------
    const error = new ApiError(
      ERROR_CODES.PROVIDER_UNSUPPORTED_OPERATION,
      'Threads webhook processing not implemented yet'
    );
    return res.status(error.statusCode).json({
      code: error.code,
      error: error.message,
    });
  } catch (error) {
    logger.error('Threads webhook processing failed', {
      error: error.message,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      error.message
    );
    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
    });
  }
};
