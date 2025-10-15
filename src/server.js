import { app } from './app.js';
import connectToDb from './config/database.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';

// Connect to TKI Social database
async function startServer() {
  try {
    // Connect to the social database
    if (config.MONGODB_TKISOCIAL_URI) {
      await connectToDb(config.MONGODB_TKISOCIAL_URI);
      logger.info('Connected to TKI Social database');
    } else {
      logger.warn(
        'MONGODB_TKISOCIAL_URI not configured - running without database'
      );
    }

    // Start the server
    const server = app.listen(config.PORT, () => {
      logger.info(`TKI Social API server running on port ${config.PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info('Auth: x-internal-secret header required');
      logger.info(`Server URL: http://localhost:${config.PORT}`);
      logger.info(`Health check: http://localhost:${config.PORT}/health`);
      logger.info(`Privacy policy: http://localhost:${config.PORT}/privacy`);
      logger.info(
        `Data deletion: http://localhost:${config.PORT}/data-deletion`
      );
      logger.info('Server connected and ready to accept requests');
      logger.info('*'.repeat(50));
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

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
export const server = await startServer();
