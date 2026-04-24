import {
  createClerkClient,
  verifyToken as verifyClerkJwt,
} from '@clerk/backend';

import { config } from '../config/env.js';
import { ApiError, ERROR_CODES } from '../constants/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Resolve the user's primary email from Clerk user payload.
 */
const getPrimaryEmail = clerkUser => {
  if (!clerkUser?.emailAddresses?.length) {
    return null;
  }

  if (clerkUser.primaryEmailAddressId) {
    const primary = clerkUser.emailAddresses.find(
      emailAddress => emailAddress.id === clerkUser.primaryEmailAddressId
    );
    return primary?.emailAddress || null;
  }

  return clerkUser.emailAddresses[0]?.emailAddress || null;
};

const getClerkClient = () =>
  createClerkClient({
    secretKey: config.CLERK_SECRET_KEY,
  });

/**
 * Middleware to verify Clerk Bearer token.
 * Supports session tokens and long-lived template tokens.
 */
export const verifyToken = async (req, res, next) => {
  logger.debug('Authentication attempt', {
    authHeader: req.headers.authorization ? 'Present' : 'Missing',
    headers: Object.keys(req.headers),
    method: req.method,
    requestId: req.id,
    url: req.url,
  });

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: ERROR_CODES.INVALID_AUTH_HEADER,
      message: 'Unauthorized: Invalid or missing bearer token',
      requestId: req.id,
    });
  }

  if (!config.CLERK_SECRET_KEY) {
    logger.error('Clerk authentication is not configured');
    return res.status(500).json({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'Authentication service is not configured',
      requestId: req.id,
    });
  }

  try {
    const token = authHeader.substring(7);
    const tokenPayload = await verifyClerkJwt(token, {
      secretKey: config.CLERK_SECRET_KEY,
    });

    const clerkClient = getClerkClient();
    let clerkUser;
    let tokenType;

    if (tokenPayload.sid) {
      tokenType = 'session';
      const session = await clerkClient.sessions.getSession(tokenPayload.sid);
      clerkUser = await clerkClient.users.getUser(session.userId);
    } else {
      tokenType = 'long-lived';
      clerkUser = await clerkClient.users.getUser(tokenPayload.sub);
    }

    const email = getPrimaryEmail(clerkUser);

    if (!email) {
      logger.warn('Clerk user has no primary email', {
        clerkUserId: clerkUser?.id,
        requestId: req.id,
      });
      return res.status(401).json({
        code: ERROR_CODES.INVALID_AUTH_HEADER,
        message: 'Unauthorized: User email is missing',
        requestId: req.id,
      });
    }

    if (
      tokenType === 'long-lived' &&
      email.toLowerCase() !== config.CLERK_LONG_LIVED_ADMIN_EMAIL.toLowerCase()
    ) {
      logger.warn('Long-lived token rejected for non-admin user', {
        email,
        requestId: req.id,
      });
      return res.status(403).json({
        code: ERROR_CODES.INVALID_AUTH_HEADER,
        message: 'Forbidden: Long-lived token not allowed for this user',
        requestId: req.id,
      });
    }

    req.authenticatedUser = {
      clerkUserId: clerkUser.id,
      email,
      oid: clerkUser.id,
      roles: tokenPayload.roles || [],
      token: tokenPayload,
      tokenType,
    };
    req.clerkUser = clerkUser;

    logger.debug('User authenticated via Clerk bearer token', {
      clerkUserId: clerkUser.id,
      email,
      requestId: req.id,
      tokenType,
    });

    return next();
  } catch (error) {
    logger.warn('Clerk token authentication failed', {
      error: error?.message,
      reason: error?.reason,
      requestId: req.id,
    });
    return res.status(401).json({
      code: ERROR_CODES.INVALID_AUTH_HEADER,
      message: 'Unauthorized: Invalid or expired bearer token',
      requestId: req.id,
    });
  }
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
