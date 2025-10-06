// TODO: Implement Reddit API client
// Reddit OAuth 2.0 client
// Base URL: https://oauth.reddit.com

export class RedditClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = 'https://oauth.reddit.com';
  }

  async get(endpoint, _params = {}) {
    throw new Error('Reddit client not implemented yet');
  }

  async post(endpoint, _data = {}) {
    throw new Error('Reddit client not implemented yet');
  }
}
