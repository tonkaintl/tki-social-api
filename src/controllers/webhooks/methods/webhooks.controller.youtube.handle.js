// ----------------------------------------------------------------------------
// POST /webhooks/youtube
// YouTube webhook event handler
// ----------------------------------------------------------------------------

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { logger } from '../../../utils/logger.js';

export const handleYouTubeWebhook = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // VERIFY WEBHOOK SIGNATURE (when YouTube adapter is implemented)
    // ------------------------------------------------------------------------
    const signature = req.headers['x-hub-signature'];
    if (!signature) {
      logger.warn('YouTube webhook missing signature header');
      const error = new ApiError(
        ERROR_CODES.MISSING_WEBHOOK_SIGNATURE,
        'Missing YouTube webhook signature'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    // ------------------------------------------------------------------------
    // LOG INCOMING EVENT
    // ------------------------------------------------------------------------
    logger.info('YouTube webhook event received', {
      body: req.body,
      hasSignature: !!signature,
    });

    // ------------------------------------------------------------------------
    // STUB: YOUTUBE PROCESSING NOT IMPLEMENTED
    // ------------------------------------------------------------------------
    const error = new ApiError(
      ERROR_CODES.PROVIDER_UNSUPPORTED_OPERATION,
      'YouTube webhook processing not implemented yet'
    );
    return res.status(error.statusCode).json({
      code: error.code,
      error: error.message,
    });
  } catch (error) {
    logger.error('YouTube webhook processing failed', {
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
