import { logger } from '../../utils/logger.js';
import { SocialAdapter } from '../adapter.types.js';

import { formatBinderItemForLinkedIn } from './formatters/binder-item.formatter.js';
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
      logger.error('LinkedIn config validation failed', {
        error: error.message,
      });
      return false;
    }
  }

  async createPost(input) {
    try {
      logger.info('Creating LinkedIn post', {
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

      logger.info('LinkedIn post created successfully', {
        postId: response.id,
      });

      return {
        externalPostId: response.id,
        permalink: `https://www.linkedin.com/feed/update/${response.id}/`,
        raw: response,
        status: 'success',
      };
    } catch (error) {
      logger.error('LinkedIn post creation failed', {
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
      logger.info('Creating LinkedIn comment', {
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

      logger.info('LinkedIn comment created successfully', {
        commentId: response.id,
      });

      return {
        externalCommentId: response.id,
        raw: response,
        status: 'success',
      };
    } catch (error) {
      logger.error('LinkedIn comment creation failed', {
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

  async createPostFromItem(item, options = {}) {
    try {
      const { pageIdOrHandle } = options;

      logger.info('Creating LinkedIn post from binder item', {
        provider: 'linkedin',
        stockNumber: item.stockNumber,
      });

      // Format the item for LinkedIn
      const message = formatBinderItemForLinkedIn(item);

      // Use createPost with formatted content
      return await this.createPost({
        message,
        pageIdOrHandle,
      });
    } catch (error) {
      logger.error('Failed to create LinkedIn post from item', {
        error: error.message,
        provider: 'linkedin',
        stockNumber: item?.stockNumber,
      });

      return {
        externalPostId: null,
        permalink: null,
        raw: { error: error.message },
        status: 'failed',
      };
    }
  }

  async createPostFromCampaign(campaign, provider, options = {}) {
    try {
      const { mediaUrls = [], pageIdOrHandle } = options;

      logger.info('Creating LinkedIn post from campaign', {
        campaignId: campaign._id,
        mediaCount: mediaUrls.length,
        provider: 'linkedin',
        stockNumber: campaign.stock_number,
      });

      // Generate dynamic content for LinkedIn
      const message = await this.generateLinkedInContent(campaign);

      // Use createPost with generated content
      return await this.createPost({
        message,
        pageIdOrHandle,
      });
    } catch (error) {
      logger.error('Failed to create LinkedIn post from campaign', {
        campaignId: campaign._id,
        error: error.message,
        provider: 'linkedin',
        stockNumber: campaign.stock_number,
      });

      return {
        externalPostId: null,
        permalink: null,
        raw: { error: error.message },
        status: 'failed',
      };
    }
  }

  /**
   * Generate LinkedIn-specific content from campaign data
   */
  async generateLinkedInContent(campaign) {
    // Use campaign title and description as base
    let content = `${campaign.title}\n\n`;

    if (campaign.description) {
      content += `${campaign.description}\n\n`;
    }

    // Add key details from Binder data if available
    if (campaign.binder_data) {
      const { make, mileage, model, price, year } = campaign.binder_data;

      if (year && make && model) {
        content += `🚗 ${year} ${make} ${model}\n`;
      }

      if (price) {
        content += `💰 Price: ${price}\n`;
      }

      if (mileage) {
        content += `📍 Mileage: ${mileage}\n`;
      }
    }

    // Add professional LinkedIn touch
    content += '\n#automotive #cars #forsale';

    return content;
  }

  async fetchPosts(input) {
    try {
      logger.info('Fetching LinkedIn posts', {
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

      logger.info('LinkedIn posts fetched successfully', {
        count: normalizedPosts.length,
        pageIdOrHandle: input.pageIdOrHandle,
      });

      return normalizedPosts;
    } catch (error) {
      logger.error('LinkedIn posts fetch failed', {
        error: error.message,
        pageIdOrHandle: input.pageIdOrHandle,
      });

      throw error;
    }
  }

  async handleWebhook(req) {
    // LinkedIn webhooks are very limited and require special approval
    // Most LinkedIn integrations use polling instead of webhooks
    logger.info('LinkedIn webhook received', {
      headers: req.headers,
      method: req.method,
    });

    // For now, return empty array as webhooks are not commonly used with LinkedIn
    return [];
  }
}
