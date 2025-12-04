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
    // Custom key generator to handle IPs with port numbers
    keyGenerator: req => {
      // Strip port number if present (e.g., "20.218.174.14:4935" -> "20.218.174.14")
      const ip =
        req.ip ||
        req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress ||
        '';
      return ip.split(':').slice(0, -1).join(':') || ip;
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
    // Acknowledge trust proxy setting - app is behind reverse proxy/load balancer
    validate: { trustProxy: false },
    windowMs,
  });
};

// General rate limiter - 400 requests per 15 minutes
export const rateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  400,
  'Too many requests, please try again later'
);

// Strict rate limiter for posting - 40 requests per hour (doubled for dev)
export const postRateLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  4000,
  'Too many post requests, please try again later'
);

// Webhook rate limiter - 1000 requests per 15 minutes
export const webhookRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  1000,
  'Webhook rate limit exceeded'
);
