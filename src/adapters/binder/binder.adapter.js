import { ApiError, ERROR_CODES } from '../../constants/errors.js';
import { logger } from '../../utils/logger.js';

import { BinderClient } from './binder.client.js';
import { normalizeBinderItem } from './binder.normalize.js';

/**
 * Adapter for accessing TKI Binder inventory database
 * Provides normalized item data for social media posting
 */
export class BinderAdapter {
  constructor(config) {
    this.config = config;
    this.client = new BinderClient(config);
  }

  /**
   * Get an equipment item by stock number
   * @param {string} stockNumber
   * @returns {Promise<Object>} Normalized item object
   */
  async getItem(stockNumber) {
    try {
      logger.info('Fetching item from binder', { stockNumber });

      // Fetch raw item from database
      const rawItem = await this.client.findItemByStockNumber(stockNumber);

      if (!rawItem) {
        throw new ApiError(
          ERROR_CODES.RESOURCE_NOT_FOUND,
          `Item with stock number '${stockNumber}' not found`,
          404
        );
      }

      // Normalize to standard format
      const item = normalizeBinderItem(rawItem);

      logger.info('Item fetched successfully', {
        stockNumber: item.stockNumber,
      });

      return item;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('Failed to fetch item from binder', {
        error: error.message,
        stockNumber,
      });

      throw new ApiError(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        `Failed to fetch item: ${error.message}`,
        500
      );
    }
  }

  /**
   * Close database connection
   */
  async close() {
    await this.client.close();
  }
}
