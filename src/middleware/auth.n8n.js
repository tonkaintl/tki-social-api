import { config } from '../config/env.js';
import { ApiError, ERROR_CODES } from '../constants/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to verify x-internal-secret header for n8n webhook calls
 * Used for n8n-to-service authentication
 */
export const verifyN8nSecret = (req, res, next) => {
  try {
    const internalSecret = req.headers['x-internal-secret'];

    logger.info(`Verifying n8n internal secret ${internalSecret}`);

    if (!internalSecret) {
      logger.warn('Missing x-internal-secret header (n8n)', {
        ip: req.ip,
        requestId: req.id,
        userAgent: req.get('User-Agent'),
      });

      const error = new ApiError(
        ERROR_CODES.AUTHENTICATION_FAILED,
        'Internal secret header required',
        401
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: null,
        message: error.message,
      });
    }

    if (internalSecret !== config.N8N_INTERNAL_SECRET) {
      logger.warn('Invalid x-internal-secret header (n8n)', {
        ip: req.ip,
        requestId: req.id,
        userAgent: req.get('User-Agent'),
      });

      const error = new ApiError(
        ERROR_CODES.AUTHENTICATION_FAILED,
        'Invalid internal secret',
        401
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: null,
        message: error.message,
      });
    }

    logger.debug('n8n internal secret verified successfully', {
      requestId: req.id,
    });

    next();
  } catch (error) {
    logger.error('Error verifying n8n internal secret', {
      error: error.message,
      requestId: req.id,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Internal server error during authentication',
      500
    );
    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: null,
      message: apiError.message,
    });
  }
};
