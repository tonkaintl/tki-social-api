import crypto from 'crypto';

/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracing
 */
export function requestId(req, res, next) {
  // Use existing request ID if provided, otherwise generate one
  const existingId = req.headers['x-request-id'];
  const requestId = existingId || crypto.randomUUID();

  // Add to request object
  req.id = requestId;

  // Add to response headers
  res.setHeader('x-request-id', requestId);

  next();
}
