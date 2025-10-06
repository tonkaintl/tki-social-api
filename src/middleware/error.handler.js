import { logger } from '../utils/logger.js';

/**
 * Global error handler middleware
 * Formats and logs errors consistently
 */
export function errorHandler(error, req, res, _next) {
  logger.error('Unhandled error', {
    error: error.message,
    method: req.method,
    path: req.path,
    requestId: req.id,
    stack: error.stack,
  });

  // Default error response
  let statusCode = 500;
  let errorResponse = {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    requestId: req.id,
  };

  // Handle known error types
  if (error.name === 'ValidationError' || error.name === 'ZodError') {
    statusCode = 400;
    errorResponse = {
      code: 'VALIDATION_ERROR',
      details: error.errors || error.issues,
      message: 'Request validation failed',
      requestId: req.id,
    };
  } else if (
    error.name === 'SyntaxError' &&
    error.type === 'entity.parse.failed'
  ) {
    statusCode = 400;
    errorResponse = {
      code: 'INVALID_JSON',
      message: 'Invalid JSON in request body',
      requestId: req.id,
    };
  } else if (error.statusCode || error.status) {
    statusCode = error.statusCode || error.status;
    errorResponse = {
      code: error.code || 'HTTP_ERROR',
      message: error.message,
      requestId: req.id,
    };
  }

  // Don't leak internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.message = 'Internal server error';
    delete errorResponse.details;
  }

  res.status(statusCode).json(errorResponse);
}
