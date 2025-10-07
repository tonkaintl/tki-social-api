import { app } from './app.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';

const server = app.listen(config.PORT, () => {
  logger.info(`TKI Social API server running on port ${config.PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info('Auth: x-internal-secret header required');
  logger.info(`Server URL: http://localhost:${config.PORT}`);
  logger.info(`Health check: http://localhost:${config.PORT}/health`);
  logger.info(`Privacy policy: http://localhost:${config.PORT}/privacy`);
  logger.info(`Data deletion: http://localhost:${config.PORT}/data-deletion`);
  logger.info('Server connected and ready to accept requests');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export { server };
