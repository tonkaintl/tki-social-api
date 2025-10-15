// ----------------------------------------------------------------------------
// GET /webhooks/meta
// Meta webhook verification handler
// ----------------------------------------------------------------------------

import { MetaAdapter } from '../../../adapters/meta/meta.adapter.js';
import { config } from '../../../config/env.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { logger } from '../../../utils/logger.js';

const metaAdapter = new MetaAdapter(config);

export const verifyMetaWebhook = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // LOG VERIFICATION REQUEST
    // ------------------------------------------------------------------------
    logger.info('Meta webhook verification request received', {
      mode: req.query['hub.mode'],
      token: req.query['hub.verify_token'] ? 'present' : 'missing',
    });

    // ------------------------------------------------------------------------
    // HANDLE VERIFICATION
    // ------------------------------------------------------------------------
    const result = await metaAdapter.handleWebhook(req);

    if (result.challenge) {
      return res.status(200).send(result.challenge);
    } else {
      const error = new ApiError(
        ERROR_CODES.PROVIDER_AUTH_FAILED,
        'Webhook verification failed'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }
  } catch (error) {
    logger.error('Meta webhook verification failed', {
      error: error.message,
    });

    const apiError = new ApiError(
      ERROR_CODES.PROVIDER_AUTH_FAILED,
      error.message,
      403
    );
    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
    });
  }
};
