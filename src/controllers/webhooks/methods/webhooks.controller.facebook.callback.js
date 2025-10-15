import { MetaAdapter } from '../../../adapters/meta/meta.adapter.js';
import { config } from '../../../config/env.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { logger } from '../../../utils/logger.js';

const metaAdapter = new MetaAdapter(config);

// ----------------------------------------------------------------------------
// GET /webhooks/facebook/callback
// Facebook OAuth callback handler
// ----------------------------------------------------------------------------
export const handleFacebookCallback = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // EXTRACT OAUTH PARAMETERS
    // ------------------------------------------------------------------------
    const { code, error, error_description } = req.query;

    if (error) {
      logger.error('Facebook OAuth error', {
        error,
        error_description,
      });

      const apiError = new ApiError(
        ERROR_CODES.PROVIDER_AUTH_FAILED,
        'Facebook OAuth failed',
        400,
        error_description || error
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        details: apiError.details,
        error: apiError.message,
      });
    }

    if (!code) {
      const error = new ApiError(
        ERROR_CODES.MISSING_REQUIRED_FIELD,
        'Missing authorization code from Facebook'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    // ------------------------------------------------------------------------
    // USE META ADAPTER TO HANDLE OAUTH CALLBACK
    // ------------------------------------------------------------------------
    const result = await metaAdapter.handleOAuthCallback({ code }, req);

    logger.info('Facebook OAuth callback completed', {
      pages_count: result.pages?.length || 0,
    });

    res.json(result);
  } catch (error) {
    logger.error('Facebook callback handler error', {
      error: error.message,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Internal server error processing Facebook callback'
    );
    res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
    });
  }
};
