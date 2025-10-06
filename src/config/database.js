import mongoose from 'mongoose';

import { logger } from '../utils/logger.js';

// Define a maximum number of retries
const MAX_RETRIES = 5;

// Async function to connect to MongoDB
async function connectToDb(mongoUri, retryCount = 0) {
  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');
    return true;
  } catch (err) {
    logger.error('Database connection error:', err);
    const currentRetry = retryCount + 1;
    if (currentRetry <= MAX_RETRIES) {
      logger.info(`Retry attempt number: ${currentRetry}`);
      // Wait for 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectToDb(mongoUri, currentRetry);
    } else {
      logger.error('Max retries exceeded');
      throw new Error('Failed to connect to MongoDB after maximum retries');
    }
  }
}

export default connectToDb;
