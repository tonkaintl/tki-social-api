import { logger } from '../../utils/logger.js';

export class LinkedInClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = 'https://api.linkedin.com/v2';
    this.restliVersion = '2.0.0';
  }

  /**
   * Make authenticated GET request to LinkedIn API
   */
  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    logger.info('LinkedIn API GET request', {
      endpoint,
      url: url.toString(),
    });

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.config.LINKEDIN_ACCESS_TOKEN}`,
          'LinkedIn-Version': this.restliVersion,
          'X-Restli-Protocol-Version': this.restliVersion,
        },
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error('LinkedIn API GET error', {
          endpoint,
          error: data,
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(
          data.message || `LinkedIn API error: ${response.status}`
        );
      }

      logger.info('LinkedIn API GET success', {
        endpoint,
        status: response.status,
      });

      return data;
    } catch (error) {
      logger.error('LinkedIn API GET request failed', {
        endpoint,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Make authenticated POST request to LinkedIn API
   */
  async post(endpoint, data = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    logger.info('LinkedIn API POST request', {
      dataKeys: Object.keys(data),
      endpoint,
      url,
    });

    try {
      const response = await fetch(url, {
        body: JSON.stringify(data),
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.config.LINKEDIN_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': this.restliVersion,
          'X-Restli-Protocol-Version': this.restliVersion,
        },
        method: 'POST',
      });

      const responseData = await response.json();

      if (!response.ok) {
        logger.error('LinkedIn API POST error', {
          endpoint,
          error: responseData,
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error(
          responseData.message || `LinkedIn API error: ${response.status}`
        );
      }

      logger.info('LinkedIn API POST success', {
        endpoint,
        status: response.status,
      });

      return responseData;
    } catch (error) {
      logger.error('LinkedIn API POST request failed', {
        endpoint,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get current user profile info
   */
  async getCurrentUser() {
    return this.get('/people/~', {
      projection:
        '(id,firstName,lastName,profilePicture(displayImage~:playableStreams))',
    });
  }

  /**
   * Get user's organizations (company pages they can post to)
   */
  async getUserOrganizations() {
    return this.get('/organizationAcls', {
      projection:
        '(elements*(organization~(id,name,logoV2(original~:playableStreams)),roleAssignee,role))',
      q: 'roleAssignee',
    });
  }
}
