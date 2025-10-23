// ----------------------------------------------------------------------------
// POST /webhooks/reddit
// Reddit webhook event handler
// ----------------------------------------------------------------------------

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { logger } from '../../../utils/logger.js';

export const handleRedditWebhook = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // VERIFY WEBHOOK SIGNATURE (when Reddit adapter is implemented)
    // ------------------------------------------------------------------------
    const signature = req.headers['x-reddit-signature'];
    if (!signature) {
      logger.warn('Reddit webhook missing signature header');
      const error = new ApiError(
        ERROR_CODES.MISSING_WEBHOOK_SIGNATURE,
        'Missing Reddit webhook signature'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    // ------------------------------------------------------------------------
    // LOG INCOMING EVENT
    // ------------------------------------------------------------------------
    logger.info('Reddit webhook event received', {
      body: req.body,
      hasSignature: !!signature,
    });

    // ------------------------------------------------------------------------
    // STUB: REDDIT PROCESSING NOT IMPLEMENTED
    // ------------------------------------------------------------------------
    const error = new ApiError(
      ERROR_CODES.PROVIDER_UNSUPPORTED_OPERATION,
      'Reddit webhook processing not implemented yet'
    );
    return res.status(error.statusCode).json({
      code: error.code,
      error: error.message,
    });
  } catch (error) {
    logger.error('Reddit webhook processing failed', {
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
