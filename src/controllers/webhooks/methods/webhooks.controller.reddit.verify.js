// ----------------------------------------------------------------------------
// GET /webhooks/reddit
// Reddit webhook verification handler
// ----------------------------------------------------------------------------

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { logger } from '../../../utils/logger.js';

export const verifyRedditWebhook = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // LOG VERIFICATION REQUEST
    // ------------------------------------------------------------------------
    logger.info('Reddit webhook verification request received');

    // ------------------------------------------------------------------------
    // STUB: REDDIT VERIFICATION NOT IMPLEMENTED
    // ------------------------------------------------------------------------
    const error = new ApiError(
      ERROR_CODES.PROVIDER_UNSUPPORTED_OPERATION,
      'Reddit webhook verification not implemented yet'
    );
    return res.status(error.statusCode).json({
      code: error.code,
      error: error.message,
    });
  } catch (error) {
    logger.error('Reddit webhook verification failed', {
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
