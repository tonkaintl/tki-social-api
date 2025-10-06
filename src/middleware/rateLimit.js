import rateLimit from 'express-rate-limit';

import { logger } from '../utils/logger.js';

// Different rate limits for different endpoints
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        requestId: req.id,
      });

      res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        requestId: req.id,
      });
    },
    legacyHeaders: false,
    max,
    message: {
      code: 'RATE_LIMIT_EXCEEDED',
      message,
    },
    skip: req => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    },
    standardHeaders: true,
    windowMs,
  });
};

// General rate limiter - 100 requests per 15 minutes
export const rateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100,
  'Too many requests, please try again later'
);

// Strict rate limiter for posting - 20 requests per hour
export const postRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  20,
  'Too many post requests, please try again later'
);

// Webhook rate limiter - 1000 requests per 15 minutes
export const webhookRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  1000,
  'Webhook rate limit exceeded'
);
