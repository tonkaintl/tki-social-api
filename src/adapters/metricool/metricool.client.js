import fetch from 'node-fetch';

import { ApiError, ERROR_CODES } from '../../constants/errors.js';
import { logger } from '../../utils/logger.js';
import { jitter, sleep } from '../../utils/mapping.js';

export class MetricoolClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = 'https://app.metricool.com/api';
    this.maxRetries = 3;
    this.initialDelayMs = 1000;
  }

  async makeRequest(method, endpoint, data = null, retryCount = 0) {
    const url = `${this.baseUrl}${endpoint}`;

    const options = {
      headers: {
        'Content-Type': 'application/json',
        'X-Mc-Auth': this.config.METRICOOL_API_TOKEN,
      },
      method,
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    if (method === 'GET' && data) {
      // Add query parameters for GET requests
      const urlObj = new URL(url);
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlObj.searchParams.set(key, value);
        }
      });
      options.url = urlObj.toString();
    }

    try {
      logger.debug(`Making ${method} request to Metricool: ${url}`, {
        endpoint,
        hasData: !!data,
        retryCount,
      });

      const response = await fetch(url, options);
      const responseData = await response.json();

      if (!response.ok) {
        logger.warn('Metricool API error response', {
          data: responseData,
          endpoint,
          status: response.status,
          statusText: response.statusText,
        });

        // Handle rate limiting
        if (response.status === 429) {
          if (retryCount < this.maxRetries) {
            const delay = this.calculateBackoffDelay(retryCount);
            logger.info(
              `Rate limited by Metricool API, retrying in ${delay}ms`,
              {
                endpoint,
                retryCount,
              }
            );
            await sleep(delay);
            return this.makeRequest(method, endpoint, data, retryCount + 1);
          }
          throw new ApiError(
            'Rate limit exceeded',
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            429,
            responseData
          );
        }

        // Handle other client/server errors
        const errorCode =
          response.status >= 500
            ? ERROR_CODES.EXTERNAL_API_ERROR
            : ERROR_CODES.VALIDATION_ERROR;

        throw new ApiError(
          `Metricool API error: ${response.statusText || 'Unknown error'} - ${JSON.stringify(responseData)}`,
          errorCode,
          response.status,
          responseData
        );
      }

      logger.debug('Metricool API request successful', {
        endpoint,
        hasData: !!responseData,
        status: response.status,
      });

      return responseData;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle network/connection errors with retry
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        const delay = this.calculateBackoffDelay(retryCount);
        logger.warn(`Retrying Metricool API request after error`, {
          delay,
          endpoint,
          error: error.message,
          retryCount,
        });
        await sleep(delay);
        return this.makeRequest(method, endpoint, data, retryCount + 1);
      }

      logger.error('Metricool API request failed', {
        endpoint,
        error: error.message,
        retryCount,
      });

      throw new ApiError(
        `Failed to communicate with Metricool API: ${error.message}`,
        ERROR_CODES.EXTERNAL_API_ERROR,
        500,
        { originalError: error.message }
      );
    }
  }

  calculateBackoffDelay(retryCount) {
    const baseDelay = this.initialDelayMs * Math.pow(2, retryCount);
    return baseDelay + jitter(baseDelay * 0.1);
  }

  isRetryableError(error) {
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.type === 'system'
    );
  }

  // API Methods

  /**
   * Test the connection by getting user profiles/blogs
   * This uses the simpleProfiles endpoint to verify authentication
   */
  async testConnection() {
    try {
      // First, we need to get the userId from the config or discover it
      if (!this.config.METRICOOL_USER_ID) {
        return {
          details: null,
          error:
            'METRICOOL_USER_ID is required but not provided in configuration',
          success: false,
        };
      }

      const response = await this.makeRequest(
        'GET',
        `/admin/simpleProfiles?userId=${this.config.METRICOOL_USER_ID}`
      );

      return {
        message: 'Successfully connected to Metricool API',
        profiles: response,
        success: true,
        userId: this.config.METRICOOL_USER_ID,
      };
    } catch (error) {
      return {
        details: error.details || null,
        error: error.message,
        success: false,
      };
    }
  }

  /**
   * Get connected social media networks/accounts
   */
  async getNetworks() {
    return this.makeRequest('GET', '/networks');
  }

  /**
   * Create a new post (draft or scheduled)
   */
  async createPost(postData) {
    // Add required query parameters as per Metricool API docs
    const endpoint = `/v2/scheduler/posts?userToken=${this.config.METRICOOL_API_TOKEN}&userId=${this.config.METRICOOL_USER_ID}&blogId=${this.config.METRICOOL_BLOG_ID}`;
    return this.makeRequest('POST', endpoint, postData);
  }

  /**
   * Get existing posts
   */
  async getPosts(filters = {}) {
    return this.makeRequest('GET', '/posts', filters);
  }

  /**
   * Update a specific post
   */
  async updatePost(postId, updateData) {
    return this.makeRequest('PATCH', `/posts/${postId}`, updateData);
  }

  /**
   * Delete a specific post
   */
  async deletePost(postId) {
    return this.makeRequest('DELETE', `/v1/posts/${postId}`);
  }

  /**
   * Get analytics reports
   */
  async getReports(filters = {}) {
    return this.makeRequest('GET', '/reports', filters);
  }
}
