import pinoHttp from 'pino-http';

import { logger } from '../utils/logger.js';

/**
 * HTTP request/response logging middleware using pino
 * Configured with custom serializers to log only relevant information
 */
export const httpLogger = pinoHttp({
  // Only log errors (not every request)
  autoLogging: {
    ignore: req => req.url === '/health',
  },
  // Custom log levels based on response status
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
  logger,
  // Custom serializers to avoid logging full request/response details
  serializers: {
    err: pinoHttp.stdSerializers.err,
    req: req => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: res => ({
      statusCode: res.statusCode,
    }),
  },
});
