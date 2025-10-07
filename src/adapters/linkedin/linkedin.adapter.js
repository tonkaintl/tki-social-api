import { SocialAdapter } from '../adapter.types.js';

import { LinkedInClient } from './linkedin.client.js';
import { normalizeLinkedInPost } from './linkedin.normalize.js';

export class LinkedInAdapter extends SocialAdapter {
  constructor(config) {
    super('linkedin', config);
    this.client = new LinkedInClient(config);
  }

  async validateConfig() {
    try {
      // Check if required credentials are present
      if (!this.config.LINKEDIN_ACCESS_TOKEN) {
        return false;
      }

      // Test API connection by getting current user
      await this.client.getCurrentUser();
      return true;
    } catch (error) {
      this.logger.error('LinkedIn config validation failed', {
        error: error.message,
      });
      return false;
    }
  }

  async createPost(input) {
    try {
      this.logger.info('Creating LinkedIn post', {
        hasMessage: !!input.message,
        pageIdOrHandle: input.pageIdOrHandle,
      });

      // LinkedIn UGC Post API payload
      const postData = {
        author: input.pageIdOrHandle || 'urn:li:person:~', // Use current user if no specific page
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: input.message,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const response = await this.client.post('/ugcPosts', postData);

      this.logger.info('LinkedIn post created successfully', {
        postId: response.id,
      });

      return {
        externalPostId: response.id,
        permalink: `https://www.linkedin.com/feed/update/${response.id}/`,
        raw: response,
        status: 'success',
      };
    } catch (error) {
      this.logger.error('LinkedIn post creation failed', {
        error: error.message,
        pageIdOrHandle: input.pageIdOrHandle,
      });

      return {
        externalPostId: null,
        permalink: null,
        raw: { error: error.message },
        status: 'failed',
      };
    }
  }

  async createComment(input) {
    try {
      this.logger.info('Creating LinkedIn comment', {
        hasMessage: !!input.message,
        threadIdOrPostId: input.threadIdOrPostId,
      });

      // LinkedIn UGC Comment API payload
      const commentData = {
        actor: 'urn:li:person:~', // Current user
        message: {
          text: input.message,
        },
        object: input.threadIdOrPostId, // The post URN to comment on
      };

      const response = await this.client.post(
        '/socialActions/comments',
        commentData
      );

      this.logger.info('LinkedIn comment created successfully', {
        commentId: response.id,
      });

      return {
        externalCommentId: response.id,
        raw: response,
        status: 'success',
      };
    } catch (error) {
      this.logger.error('LinkedIn comment creation failed', {
        error: error.message,
        threadIdOrPostId: input.threadIdOrPostId,
      });

      return {
        externalCommentId: null,
        raw: { error: error.message },
        status: 'failed',
      };
    }
  }

  async fetchPosts(input) {
    try {
      this.logger.info('Fetching LinkedIn posts', {
        pageIdOrHandle: input.pageIdOrHandle,
      });

      // Determine the author URN (person or organization)
      const authorUrn = input.pageIdOrHandle || 'urn:li:person:~';

      // Fetch UGC posts for the specified author
      const response = await this.client.get('/ugcPosts', {
        authors: authorUrn,
        count: input.limit || 25,
        q: 'authors',
        sortBy: 'CREATED',
      });

      // Normalize the posts
      const normalizedPosts =
        response.elements?.map(post => normalizeLinkedInPost(post)) || [];

      this.logger.info('LinkedIn posts fetched successfully', {
        count: normalizedPosts.length,
        pageIdOrHandle: input.pageIdOrHandle,
      });

      return normalizedPosts;
    } catch (error) {
      this.logger.error('LinkedIn posts fetch failed', {
        error: error.message,
        pageIdOrHandle: input.pageIdOrHandle,
      });

      throw error;
    }
  }

  async handleWebhook(req) {
    // LinkedIn webhooks are very limited and require special approval
    // Most LinkedIn integrations use polling instead of webhooks
    this.logger.info('LinkedIn webhook received', {
      headers: req.headers,
      method: req.method,
    });

    // For now, return empty array as webhooks are not commonly used with LinkedIn
    return [];
  }
}
