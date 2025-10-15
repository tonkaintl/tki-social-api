import { ApiError, ERROR_CODES } from '../../constants/errors.js';
import SocialCampaigns from '../../models/socialCampaigns.model.js';
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
   * Create social campaign from binder item
   * This is the BINDER → NORMALIZE → STORE pipeline
   * @param {string} stockNumber
   * @param {string} createdBy - User who created the campaign
   * @returns {Promise<Object>} Created campaign
   */
  async createCampaign(stockNumber, createdBy) {
    try {
      logger.info('Creating social campaign from binder item', {
        createdBy,
        stockNumber,
      });

      // Step 1: Fetch and normalize item from binder
      const normalizedItem = await this.getItem(stockNumber);

      // Step 2: Generate URL for the item (assuming main site pattern)
      const itemUrl = `https://tonkaintl.com/inventory/${stockNumber}`;

      // Step 3: Create campaign data structure
      const campaignData = {
        created_by: createdBy,
        description: normalizedItem.description,
        media_urls: normalizedItem.media
          ? normalizedItem.media.map(m => m.url)
          : [],
        short_url: normalizedItem.shortUrl,

        // Set initial status
        status: 'pending',

        stock_number: normalizedItem.stockNumber,
        title: normalizedItem.title,
        url: itemUrl,
      };

      // Step 3: Save to database
      const campaign = await SocialCampaigns.create(campaignData);

      logger.info('Social campaign created successfully', {
        campaignId: campaign._id,
        status: campaign.status,
        stockNumber,
      });

      return campaign;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      logger.error('Failed to create social campaign', {
        createdBy,
        error: error.message,
        stockNumber,
      });

      throw new ApiError(
        ERROR_CODES.DATABASE_ERROR,
        `Failed to create campaign: ${error.message}`,
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
