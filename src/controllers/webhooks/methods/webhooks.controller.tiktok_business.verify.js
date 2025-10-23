// ----------------------------------------------------------------------------
// GET /webhooks/tiktok-business
// TikTok Business webhook verification handler
// ----------------------------------------------------------------------------

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { logger } from '../../../utils/logger.js';

export const verifyTikTokBusinessWebhook = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // LOG VERIFICATION REQUEST
    // ------------------------------------------------------------------------
    logger.info('TikTok Business webhook verification request received');

    // ------------------------------------------------------------------------
    // STUB: TIKTOK BUSINESS VERIFICATION NOT IMPLEMENTED
    // ------------------------------------------------------------------------
    const error = new ApiError(
      ERROR_CODES.PROVIDER_UNSUPPORTED_OPERATION,
      'TikTok Business webhook verification not implemented yet'
    );
    return res.status(error.statusCode).json({
      code: error.code,
      error: error.message,
    });
  } catch (error) {
    logger.error('TikTok Business webhook verification failed', {
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
