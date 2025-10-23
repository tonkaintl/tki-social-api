// ----------------------------------------------------------------------------
// POST /webhooks/x
// X (Twitter) webhook event handler
// ----------------------------------------------------------------------------

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { logger } from '../../../utils/logger.js';

export const handleXWebhook = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // VERIFY WEBHOOK SIGNATURE (when X adapter is implemented)
    // ------------------------------------------------------------------------
    const signature = req.headers['x-twitter-webhooks-signature'];
    if (!signature) {
      logger.warn('X webhook missing signature header');
      const error = new ApiError(
        ERROR_CODES.MISSING_WEBHOOK_SIGNATURE,
        'Missing X webhook signature'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    // ------------------------------------------------------------------------
    // LOG INCOMING EVENT
    // ------------------------------------------------------------------------
    logger.info('X webhook event received', {
      body: req.body,
      hasSignature: !!signature,
    });

    // ------------------------------------------------------------------------
    // STUB: X PROCESSING NOT IMPLEMENTED
    // ------------------------------------------------------------------------
    const error = new ApiError(
      ERROR_CODES.PROVIDER_UNSUPPORTED_OPERATION,
      'X webhook processing not implemented yet'
    );
    return res.status(error.statusCode).json({
      code: error.code,
      error: error.message,
    });
  } catch (error) {
    logger.error('X webhook processing failed', {
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
