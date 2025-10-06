import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { errorHandler } from './middleware/error.handler.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { requestId } from './middleware/requestId.js';
import { socialRoutes, webhooksRoutes } from './routes/index.js';
import { logger } from './utils/logger.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Request logging
app.use(pinoHttp({ logger }));

// Request ID middleware
app.use(requestId);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({
    service: 'tki-social-api',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Application routes
app.use('/social', socialRoutes);
app.use('/social/webhooks', webhooksRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export { app };
