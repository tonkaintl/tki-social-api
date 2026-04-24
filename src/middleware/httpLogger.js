import { randomUUID } from 'node:crypto';

import { logger } from '../utils/logger.js';

/**
 * Lightweight HTTP request/response logger.
 * - Skips /health
 * - Assigns req.id (uuid) so downstream handlers can correlate logs
 * - Logs once on response finish with method, url, status, and ms
 */
export const httpLogger = (req, res, next) => {
  if (req.url === '/health') return next();

  req.id = req.headers['x-request-id'] || randomUUID();
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const meta = {
      id: req.id,
      method: req.method,
      ms: Math.round(ms),
      status: res.statusCode,
      url: req.url,
    };
    if (res.statusCode >= 500) {
      logger.error('request completed', meta);
    } else if (res.statusCode >= 400) {
      logger.warn('request completed', meta);
    } else {
      logger.info('request completed', meta);
    }
  });

  next();
};
