import { logger } from '../utils/logger.js';

/**
 * Global error handler middleware
 * Formats and logs errors consistently
 */
export function errorHandler(error, req, res, _next) {
  // Log full error details
  logger.error('Unhandled error', {
    code: error.code,
    error: error.message,
    method: req.method,
    name: error.name,
    path: req.path,
    requestId: req.id,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    statusCode: error.statusCode || error.status,
  });

  // Default error response
  let statusCode = 500;
  let errorResponse = {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    requestId: req.id,
  };

  // Include full error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.debug = {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

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
