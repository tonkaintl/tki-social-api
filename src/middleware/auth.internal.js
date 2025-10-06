import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Internal authentication middleware
 * Validates x-internal-secret header against configured secret
 */
export function internalAuth(req, res, next) {
  const providedSecret = req.headers['x-internal-secret'];

  if (!providedSecret) {
    logger.warn('Missing x-internal-secret header', {
      ip: req.ip,
      path: req.path,
      requestId: req.id,
    });

    return res.status(401).json({
      code: 'MISSING_AUTH_HEADER',
      message: 'x-internal-secret header is required',
    });
  }

  if (providedSecret !== config.INTERNAL_SECRET_KEY) {
    logger.warn('Invalid x-internal-secret header', {
      ip: req.ip,
      path: req.path,
      requestId: req.id,
    });

    return res.status(401).json({
      code: 'INVALID_AUTH_HEADER',
      message: 'Invalid x-internal-secret',
    });
  }

  // Valid authentication
  next();
}
