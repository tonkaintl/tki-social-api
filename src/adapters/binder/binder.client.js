import mongoose from 'mongoose';

import { ApiError, ERROR_CODES } from '../../constants/errors.js';
import { logger } from '../../utils/logger.js';

/**
 * MongoDB client for tki-binder inventory database
 * Handles connection and queries for equipment items
 */
export class BinderClient {
  constructor(config) {
    this.binderDbUri = config.MONGODB_TKIBINDER_URI;
    this.connection = null;
    this.ItemModel = null;
  }

  /**
   * Initialize connection to tki-binder database
   */
  async initialize() {
    if (this.connection) {
      return; // Already connected
    }

    try {
      // Create a separate connection for the binder database
      this.connection = await mongoose.createConnection(this.binderDbUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
      });

      logger.info('Connected to tki-binder inventory database');

      // Define the Item schema - MongoDB uses snake_case fields
      const itemSchema = new mongoose.Schema(
        {
          category: String,
          condition: String,
          description: String,
          equipment_description: String,
          hours: Number,
          images: [String],
          location: {
            address: String,
            city: String,
            contact: String,
            country: String,
            email: String,
            job_title: String,
            location_type: String,
            phone: String,
            pickup_hours: String,
            state: String,
            zip: String,
          },
          make: String,
          model: String,
          price: Number,
          serial_number: String,
          status: String,
          stock_number: String,
          year: Number,
        },
        {
          collection: 'items',
          strict: false, // Allow fields not in schema
        }
      );

      this.ItemModel = this.connection.model('Item', itemSchema);
    } catch (error) {
      logger.error('Failed to connect to tki-binder database', {
        error: error.message,
      });
      throw new ApiError(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        `Failed to connect to inventory database: ${error.message}`,
        500
      );
    }
  }

  /**
   * Find an item by stock number
   * @param {string} stockNumber
   * @returns {Promise<Object>} Raw item from database
   */
  async findItemByStockNumber(stockNumber) {
    await this.initialize();

    logger.debug('Querying item by stock number', { stockNumber });

    const item = await this.ItemModel.findOne({
      stock_number: stockNumber,
    }).lean();

    if (!item) {
      logger.warn('Item not found', { stockNumber });
      return null;
    }

    logger.debug('Item found', { itemId: item._id, stockNumber });
    return item;
  }

  /**
   * Close the database connection
   */
  async close() {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      this.ItemModel = null;
      logger.info('Closed tki-binder inventory database connection');
    }
  }
}
