import fetch from 'node-fetch';

import { ApiError, ERROR_CODES } from '../../constants/errors.js';
import { logger } from '../../utils/logger.js';
import { jitter, sleep } from '../../utils/mapping.js';

export class ThreadsClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = 'https://graph.threads.net';
    this.maxRetries = 3;
    this.initialDelayMs = 1000;
  }

  async makeRequest(method, endpoint, data = null, retryCount = 0) {
    const url = `${this.baseUrl}${endpoint}`;

    const options = {
      headers: {
        'Content-Type': 'application/json',
      },
      method,
    };

    // Add access token to URL params
    const urlObj = new URL(url);
    urlObj.searchParams.set('access_token', this.config.THREADS_ACCESS_TOKEN);

    if (method === 'GET' && data) {
      // Add query parameters for GET requests
      Object.keys(data).forEach(key => {
        urlObj.searchParams.set(key, data[key]);
      });
    } else if (data) {
      // Add JSON body for POST requests
      options.body = JSON.stringify(data);
    }

    try {
      logger.debug('Making Threads API request', {
        hasBody: !!options.body,
        method,
        url: urlObj
          .toString()
          .replace(/access_token=[^&]+/, 'access_token=***'),
      });

      const response = await fetch(urlObj.toString(), options);
      const responseData = await response.json();

      if (!response.ok) {
        throw new ApiError(
          ERROR_CODES.PROVIDER_REQUEST_FAILED,
          responseData.error?.message || 'Threads API request failed',
          response.status,
          responseData.error
        );
      }

      return responseData;
    } catch (error) {
      logger.error('Threads API request failed', {
        error: error.message,
        method,
        retryCount,
        statusCode: error.statusCode,
      });

      // Check if we should retry
      if (this.shouldRetry(error, retryCount)) {
        const delay = this.calculateRetryDelay(retryCount);

        logger.info(`Retrying Threads API request in ${delay}ms`, {
          method,
          retryCount: retryCount + 1,
        });

        await sleep(delay);
        return this.makeRequest(method, endpoint, data, retryCount + 1);
      }

      // Don't retry, throw the error
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    return this.makeRequest('GET', endpoint, params);
  }

  async post(endpoint, data = {}) {
    return this.makeRequest('POST', endpoint, data);
  }

  shouldRetry(error, retryCount) {
    // Don't retry if we've exceeded max attempts
    if (retryCount >= this.maxRetries) {
      return false;
    }

    // Don't retry on authentication errors
    if (error.statusCode === 401 || error.statusCode === 403) {
      return false;
    }

    // Don't retry on validation errors
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return false;
    }

    // Retry on rate limits and server errors
    if (error.statusCode === 429 || error.statusCode >= 500) {
      return true;
    }

    // Retry on network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    return false;
  }

  calculateRetryDelay(retryCount) {
    // Exponential backoff with jitter
    const baseDelay = this.initialDelayMs * Math.pow(2, retryCount);
    return jitter(baseDelay, 1000);
  }
}
