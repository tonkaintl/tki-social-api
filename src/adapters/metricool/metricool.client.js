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
        // Only set X-Mc-Auth header if endpoint doesn't already have userToken query param
        ...(endpoint.includes('userToken=')
          ? {}
          : { 'X-Mc-Auth': this.config.METRICOOL_API_TOKEN }),
      },
      method,
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    let finalUrl = url;
    if (method === 'GET' && data) {
      // Add query parameters for GET requests
      const urlObj = new URL(url);
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlObj.searchParams.set(key, value);
        }
      });
      finalUrl = urlObj.toString();
    }

    try {
      logger.debug(`Making ${method} request to Metricool: ${finalUrl}`, {
        endpoint,
        hasData: !!data,
        retryCount,
      });

      const response = await fetch(finalUrl, options);
      const responseData = await response.json();

      if (!response.ok) {
        logger.warn('Metricool API error response', {
          data: responseData,
          endpoint,
          requestBody: data,
          requestHeaders: options.headers,
          status: response.status,
          statusText: response.statusText,
          url: url.replace(
            this.config.METRICOOL_API_TOKEN || '',
            'HIDDEN_TOKEN'
          ),
        });

        // LOG THE EXACT ERROR RESPONSE FROM METRICOOL
        logger.error(
          `METRICOOL ERROR DETAILS: STATUS=${response.status} RESPONSE=${JSON.stringify(responseData)}`
        );

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
   * Get existing posts (using v2 scheduler API)
   */
  async getPosts(filters = {}) {
    const endpoint = `/v2/scheduler/posts?userToken=${this.config.METRICOOL_API_TOKEN}&userId=${this.config.METRICOOL_USER_ID}&blogId=${this.config.METRICOOL_BLOG_ID}`;
    return this.makeRequest('GET', endpoint, filters);
  }

  /**
   * Get all scheduled and draft posts (convenience method)
   * Returns all posts without date filtering
   */
  async getAllScheduledAndDraftPosts() {
    // Build the complete URL with authentication parameters
    const authParams = `userToken=${this.config.METRICOOL_API_TOKEN}&userId=${this.config.METRICOOL_USER_ID}&blogId=${this.config.METRICOOL_BLOG_ID}`;

    // Get a wide date range to capture all posts
    const now = new Date();
    const past = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
    const future = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year ahead

    // Format dates for Metricool API - they expect yyyy-MM-dd'T'HH:mm:ss format
    const startDate = past.toISOString().slice(0, 19); // YYYY-MM-DDTHH:mm:ss format
    const endDate = future.toISOString().slice(0, 19); // YYYY-MM-DDTHH:mm:ss format

    const endpoint = `/v2/scheduler/posts?${authParams}&start=${startDate}&end=${endDate}`;

    logger.info('DEBUG: Making Metricool GET request to:', {
      dateRange: { endDate, startDate },
      endpoint: endpoint.replace(
        this.config.METRICOOL_API_TOKEN,
        'HIDDEN_TOKEN'
      ),
      hasCredentials: {
        blogId: !!this.config.METRICOOL_BLOG_ID,
        token: !!this.config.METRICOOL_API_TOKEN,
        userId: !!this.config.METRICOOL_USER_ID,
      },
    });

    try {
      const result = await this.makeRequest('GET', endpoint);
      logger.info('DEBUG: Metricool API response received:', {
        dataLength: result?.data?.length || 0,
        error: result?.error || null,
        firstPost: result?.data?.[0] || null,
        success: !!result,
      });

      return result;
    } catch (error) {
      logger.error('DEBUG: Metricool API call failed:', {
        endpoint: endpoint.replace(
          this.config.METRICOOL_API_TOKEN,
          'HIDDEN_TOKEN'
        ),
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get posts by status (draft, scheduled, published, etc.)
   */
  async getPostsByStatus(statuses = ['DRAFT', 'PENDING']) {
    const allPosts = await this.getAllScheduledAndDraftPosts();

    if (!allPosts.success || !allPosts.data) {
      return allPosts;
    }

    logger.info('DEBUG: Filtering posts by status', {
      statuses,
      totalPosts: allPosts.data.length,
    });

    // Filter posts by provider status
    const filteredPosts = allPosts.data.filter(post => {
      if (!post.providers || !Array.isArray(post.providers)) {
        logger.warn('DEBUG: Post has no providers', { postId: post.id });
        return false;
      }

      // Check if any provider has the desired status
      const hasDesiredStatus = post.providers.some(provider =>
        statuses.includes(provider.status)
      );

      if (!hasDesiredStatus) {
        logger.info('DEBUG: Post filtered out', {
          desiredStatuses: statuses,
          postId: post.id,
          providerStatuses: post.providers.map(p => p.status),
        });
      }

      return hasDesiredStatus;
    });

    logger.info('DEBUG: Filter results', {
      filteredCount: filteredPosts.length,
      statuses,
      totalPosts: allPosts.data.length,
    });

    return {
      ...allPosts,
      count: filteredPosts.length,
      data: filteredPosts,
    };
  }

  /**
   * Get a specific post by ID
   */
  async getPost(postId) {
    const endpoint = `/v2/scheduler/posts/${postId}?userToken=${this.config.METRICOOL_API_TOKEN}&userId=${this.config.METRICOOL_USER_ID}&blogId=${this.config.METRICOOL_BLOG_ID}`;
    return this.makeRequest('GET', endpoint);
  }

  /**
   * Update a specific post
   */
  async updatePost(postId, updateData, fieldsToUpdate = []) {
    // Metricool API requires PATCH method and fields query parameter
    // Determine which fields are being updated if not explicitly provided
    if (fieldsToUpdate.length === 0 && updateData) {
      fieldsToUpdate = Object.keys(updateData);
    }

    // Try v1 API with PATCH as suggested by external sources
    // No fields parameter needed for v1
    const endpoint = `/v1/posts/${postId}?userId=${this.config.METRICOOL_USER_ID}&blogId=${this.config.METRICOOL_BLOG_ID}`;

    logger.error(
      `METRICOOL UPDATE: METHOD=PATCH ENDPOINT=${endpoint} PAYLOAD=${JSON.stringify(updateData)}`
    );

    return this.makeRequest('PATCH', endpoint, updateData);
  }

  /**
   * Delete a specific post
   */
  async deletePost(postId) {
    // Use v2 API for consistency with other operations
    const endpoint = `/v2/scheduler/posts/${postId}?userToken=${this.config.METRICOOL_API_TOKEN}&userId=${this.config.METRICOOL_USER_ID}&blogId=${this.config.METRICOOL_BLOG_ID}`;

    logger.info('METRICOOL DELETE:', {
      endpoint: endpoint.replace(
        this.config.METRICOOL_API_TOKEN,
        'HIDDEN_TOKEN'
      ),
      postId,
    });

    return this.makeRequest('DELETE', endpoint);
  }

  /**
   * Get analytics reports
   */
  async getReports(filters = {}) {
    return this.makeRequest('GET', '/reports', filters);
  }
}
