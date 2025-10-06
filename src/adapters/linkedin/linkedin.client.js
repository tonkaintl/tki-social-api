// TODO: Implement LinkedIn API client
// Similar to MetaGraphClient but for LinkedIn API v2
// Base URL: https://api.linkedin.com/v2
// Authentication: Bearer token with appropriate scopes

export class LinkedInClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = 'https://api.linkedin.com/v2';
  }

  async get(endpoint, _params = {}) {
    throw new Error('LinkedIn client not implemented yet');
  }

  async post(endpoint, _data = {}) {
    throw new Error('LinkedIn client not implemented yet');
  }
}
