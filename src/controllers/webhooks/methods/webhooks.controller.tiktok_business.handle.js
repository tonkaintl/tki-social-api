// ----------------------------------------------------------------------------
// POST /webhooks/tiktok-business
// TikTok Business webhook event handler
// ----------------------------------------------------------------------------

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { logger } from '../../../utils/logger.js';

export const handleTikTokBusinessWebhook = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // VERIFY WEBHOOK SIGNATURE (when TikTok Business adapter is implemented)
    // ------------------------------------------------------------------------
    const signature = req.headers['x-tiktok-signature'];
    if (!signature) {
      logger.warn('TikTok Business webhook missing signature header');
      const error = new ApiError(
        ERROR_CODES.MISSING_WEBHOOK_SIGNATURE,
        'Missing TikTok Business webhook signature'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    // ------------------------------------------------------------------------
    // LOG INCOMING EVENT
    // ------------------------------------------------------------------------
    logger.info('TikTok Business webhook event received', {
      body: req.body,
      hasSignature: !!signature,
    });

    // ------------------------------------------------------------------------
    // STUB: TIKTOK BUSINESS PROCESSING NOT IMPLEMENTED
    // ------------------------------------------------------------------------
    const error = new ApiError(
      ERROR_CODES.PROVIDER_UNSUPPORTED_OPERATION,
      'TikTok Business webhook processing not implemented yet'
    );
    return res.status(error.statusCode).json({
      code: error.code,
      error: error.message,
    });
  } catch (error) {
    logger.error('TikTok Business webhook processing failed', {
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
