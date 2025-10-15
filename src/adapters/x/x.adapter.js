import { SocialAdapter } from '../adapter.types.js';

// import { formatBinderItemForX } from './formatters/binder-item.formatter.js';

export class XAdapter extends SocialAdapter {
  constructor(config) {
    super('x', config);
  }

  async validateConfig() {
    // TODO: Implement X (Twitter) config validation
    return false;
  }

  async createPost(_input) {
    // TODO: Implement X post creation
    // X API v2 endpoints:
    // - POST https://api.twitter.com/2/tweets
    //
    // Required: OAuth 2.0 Bearer Token or OAuth 1.0a
    // Character limits and media handling differ from other platforms

    return {
      externalPostId: null,
      permalink: null,
      raw: { error: 'X/Twitter API credentials not configured' },
      status: 'failed',
    };
  }

  async createComment(_input) {
    // TODO: Implement X reply creation
    // X API: POST https://api.twitter.com/2/tweets with reply parameters

    return {
      externalCommentId: null,
      raw: { error: 'X/Twitter API credentials not configured' },
      status: 'failed',
    };
  }

  async createPostFromItem(item, _options = {}) {
    // TODO: Implement X post from item
    // When implemented, use: formatBinderItemForX(item)

    return {
      externalPostId: null,
      permalink: null,
      raw: { error: 'X/Twitter API credentials not configured', item },
      status: 'failed',
    };
  }

  async createPostFromCampaign(campaign, provider, _options = {}) {
    // TODO: Implement X post from campaign
    // When implemented, use: this.generateXContent(campaign)

    return {
      externalPostId: null,
      permalink: null,
      raw: {
        campaign: campaign.stock_number,
        error: 'X/Twitter API credentials not configured',
        provider,
      },
      status: 'failed',
    };
  }

  async fetchPosts(_input) {
    // TODO: Implement X post fetching
    // X API v2 endpoints:
    // - GET https://api.twitter.com/2/users/{id}/tweets
    // - GET https://api.twitter.com/2/tweets/search/recent

    return [];
  }

  async handleWebhook(_req) {
    // TODO: Implement X webhook handling
    // X Account Activity API or Twitter API v2 filtered stream

    return [];
  }
}
