import fetch from 'node-fetch';

import { config } from '../config/env.js';
import { ApiError, ERROR_CODES } from '../constants/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Service for interacting with the Portal API
 * Handles customer portal operations and integrations
 */
class PortalService {
  constructor() {
    this.baseUrl = config.PORTAL_API_URL;
    this.internalSecret = config.PORTAL_INTERNAL_SECRET;
  }

  async makeRequest(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;

    const options = {
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': this.internalSecret,
      },
      method,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      logger.debug('Making Portal API request', {
        hasBody: !!options.body,
        method,
        url,
      });

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          `Portal API request failed: ${response.status} ${errorText}`,
          response.status
        );
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      logger.error('Portal API request failed', {
        error: error.message,
        method,
        url,
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        `Failed to communicate with Portal service: ${error.message}`,
        500
      );
    }
  }

  /**
   * Generate a portal link for a customer
   */
  async generatePortalLink(customerId, options = {}) {
    try {
      const response = await this.makeRequest(
        'POST',
        '/integrations/portal/generate-link',
        {
          customerId,
          ...options,
        }
      );

      logger.info('Portal link generated successfully', {
        customerId,
        linkId: response.id,
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate portal link', {
        customerId,
        error: error.message,
        options,
      });
      throw error;
    }
  }

  /**
   * Validate a portal token
   */
  async validatePortalToken(token) {
    try {
      const response = await this.makeRequest(
        'POST',
        '/integrations/portal/validate-token',
        { token }
      );

      logger.info('Portal token validated successfully', {
        isValid: response.valid,
        tokenId: response.tokenId,
      });

      return response;
    } catch (error) {
      logger.error('Failed to validate portal token', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Log portal activity
   */
  async logActivity(activityData) {
    try {
      const response = await this.makeRequest(
        'POST',
        '/integrations/portal/activity',
        activityData
      );

      logger.info('Portal activity logged successfully', {
        activityId: response.id,
        customerId: activityData.customerId,
        type: activityData.type,
      });

      return response;
    } catch (error) {
      logger.error('Failed to log portal activity', {
        activityData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Health check for Portal service
   */
  async healthCheck() {
    try {
      const response = await this.makeRequest('GET', '/health');
      return response;
    } catch (error) {
      logger.error('Portal health check failed', {
        error: error.message,
      });
      throw error;
    }
  }
}

// Singleton instance
const portalService = new PortalService();

export { portalService };
