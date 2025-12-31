import { verifyToken } from './auth.bearer.js';
import { verifyN8nSecret } from './auth.n8n.js';

/**
 * Middleware that accepts either n8n secret OR bearer token authentication
 * Tries n8n secret first, then falls back to bearer token
 */
export const verifyEitherAuth = (req, res, next) => {
  // Check if x-internal-secret header is present
  const hasN8nSecret = req.headers['x-internal-secret'];

  if (hasN8nSecret) {
    // Try n8n authentication
    return verifyN8nSecret(req, res, next);
  }

  // Fall back to bearer token authentication
  return verifyToken(req, res, next);
};
