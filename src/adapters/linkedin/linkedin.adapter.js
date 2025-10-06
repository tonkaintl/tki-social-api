import { SocialAdapter } from '../adapter.types.js';

export class LinkedInAdapter extends SocialAdapter {
  constructor(config) {
    super('linkedin', config);
  }

  async validateConfig() {
    // TODO: Implement LinkedIn config validation
    return false;
  }

  async createPost(_input) {
    // TODO: Implement LinkedIn post creation
    // LinkedIn API endpoints:
    // - POST https://api.linkedin.com/v2/shares (for personal posts)
    // - POST https://api.linkedin.com/v2/ugcPosts (for UGC posts)
    //
    // Required: LinkedIn access token with w_member_social scope
    // Different payload structure compared to Meta

    return {
      externalPostId: null,
      permalink: null,
      raw: { error: 'LinkedIn adapter not configured yet' },
      status: 'failed',
    };
  }

  async createComment(_input) {
    // TODO: Implement LinkedIn comment creation
    // Note: LinkedIn has limited commenting API - may not be available for all use cases

    return {
      externalCommentId: null,
      raw: { error: 'LinkedIn commenting not configured yet' },
      status: 'failed',
    };
  }

  async fetchPosts(_input) {
    // TODO: Implement LinkedIn post fetching
    // LinkedIn API endpoints:
    // - GET https://api.linkedin.com/v2/shares (for personal shares)
    // - GET https://api.linkedin.com/v2/ugcPosts (for UGC posts)

    return [];
  }

  async handleWebhook(_req) {
    // TODO: Implement LinkedIn webhook handling
    // Note: LinkedIn webhooks are limited and may require special approval

    return [];
  }
}
