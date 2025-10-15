import passport from 'passport';

import { ApiError, ERROR_CODES } from '../constants/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to verify Azure AD Bearer token
 * Authenticates the user via passport-azure-ad strategy
 */
export const verifyToken = (req, res, next) => {
  // Debug: Log request headers to see if Authorization header is present
  logger.debug('Authentication attempt', {
    authHeader: req.headers.authorization ? 'Present' : 'Missing',
    headers: Object.keys(req.headers),
    method: req.method,
    requestId: req.id,
    url: req.url,
  });

  passport.authenticate(
    'oauth-bearer',
    { session: false },
    async (err, user, info) => {
      if (err) {
        logger.error('Token authentication error', { error: err.message });
        return next(err);
      }

      if (!user) {
        logger.warn('Token authentication failed', {
          info: info?.message,
          requestId: req.id,
        });
        return res.status(401).json({
          code: ERROR_CODES.INVALID_AUTH_HEADER,
          message: 'Unauthorized: Invalid or missing bearer token',
          requestId: req.id,
        });
      }

      // Attach user email to request for downstream use
      req.authenticatedUser = {
        email: req.email,
        oid: user.oid,
        roles: user.roles || [],
        token: req.azureToken,
      };

      logger.debug('User authenticated via bearer token', {
        email: req.email,
        oid: user.oid,
        requestId: req.id,
      });

      next();
    }
  )(req, res, next);
};

/**
 * Optional: Verify user has specific roles
 * @param {string[]} allowedRoles - Array of role names
 */
export const verifyRoles = allowedRoles => {
  return (req, res, next) => {
    if (!req.authenticatedUser) {
      throw new ApiError(
        ERROR_CODES.MISSING_AUTH_HEADER,
        'Authentication required',
        401
      );
    }

    const userRoles = req.authenticatedUser.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      logger.warn('User lacks required role', {
        allowedRoles,
        email: req.authenticatedUser.email,
        requestId: req.id,
        userRoles,
      });

      return res.status(403).json({
        code: ERROR_CODES.INVALID_AUTH_HEADER,
        message: 'Forbidden: Insufficient permissions',
        requestId: req.id,
      });
    }

    next();
  };
};
