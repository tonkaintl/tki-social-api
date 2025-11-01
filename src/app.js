import path from 'path';
import { fileURLToPath } from 'url';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import passport from 'passport';

import { config } from './config/env.js';
import { errorHandler } from './middleware/error.handler.js';
import { httpLogger } from './middleware/httpLogger.js';
import configurePassport from './middleware/passport.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { requestId } from './middleware/requestId.js';
import {
  campaignRoutes,
  healthRoutes,
  internalRoutes,
  metricoolRoutes,
  platformsRoutes,
  webhooksRoutes,
  writersRoomAdsRoutes,
} from './routes/index.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configure passport for Azure AD authentication (if credentials are provided)
if (config.AZURE_CLIENT_ID && config.AZURE_TENANT_ID) {
  configurePassport();
  app.use(passport.initialize());
  logger.info('Azure AD Bearer authentication enabled');
} else {
  logger.warn('Azure AD credentials not configured - bearer auth disabled');
}

// Security middleware
app.use(helmet());
app.use(cors());

// Request logging
app.use(httpLogger);

// Request ID middleware
app.use(requestId);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Serve static HTML pages (for platform verification)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

// Application routes
app.use('/api/campaigns', campaignRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/metricool', metricoolRoutes);
app.use('/api/platforms', platformsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/writers-room-ads', writersRoomAdsRoutes);

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
