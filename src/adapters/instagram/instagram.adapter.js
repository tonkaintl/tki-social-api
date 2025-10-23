import { ApiError, ERROR_CODES } from '../../constants/errors.js';
import { logger } from '../../utils/logger.js';
import { SocialAdapter } from '../adapter.types.js';

import { formatBinderItemForInstagram } from './formatters/binder-item.formatter.js';
import { InstagramClient } from './instagram.client.js';

export class InstagramAdapter extends SocialAdapter {
  constructor(config) {
    super('instagram', config);
    this.client = new InstagramClient(config);

    this.requiredConfig = [
      'INSTAGRAM_CLIENT_ID',
      'INSTAGRAM_CLIENT_SECRET',
      'INSTAGRAM_ACCESS_TOKEN',
    ];
  }

  async validateConfig() {
    const missing = this.requiredConfig.filter(key => !this.config[key]);

    if (missing.length > 0) {
      throw new ApiError(
        ERROR_CODES.PROVIDER_CONFIG_MISSING,
        `Instagram adapter missing required configuration: ${missing.join(', ')}`,
        500
      );
    }

    // Test the access token
    try {
      await this.client.get('/me', {
        fields: 'id,username',
      });
      return true;
    } catch (error) {
      logger.error('Instagram config validation failed', {
        error: error.message,
      });
      throw new ApiError(
        ERROR_CODES.PROVIDER_AUTH_FAILED,
        'Instagram access token validation failed',
        401
      );
    }
  }

  async createPost(input) {
    try {
      const { mediaUrls = [] } = input;

      logger.info('Creating Instagram post', {
        hasMedia: mediaUrls.length > 0,
        provider: 'instagram',
      });

      // Instagram posts require media
      if (!mediaUrls || mediaUrls.length === 0) {
        throw new ApiError(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'Instagram posts require at least one media URL',
          400
        );
      }

      // TODO: Implement Instagram posting logic
      // This will require creating media containers and publishing them

      return {
        externalPostId: null,
        permalink: null,
        raw: { message: 'Instagram posting not yet implemented' },
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to create Instagram post', {
        error: error.message,
        provider: 'instagram',
      });

      if (error instanceof ApiError) {
        throw error;
      }

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
      const { threadIdOrPostId } = input;

      // TODO: Implement Instagram comment creation
      logger.info('Creating Instagram comment', {
        postId: threadIdOrPostId,
        provider: 'instagram',
      });

      return {
        externalCommentId: null,
        raw: { message: 'Instagram commenting not yet implemented' },
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to create Instagram comment', {
        error: error.message,
        postId: input.threadIdOrPostId,
        provider: 'instagram',
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
      const { mediaUrls, pageIdOrHandle, utm } = options;

      logger.info('Creating Instagram post from binder item', {
        provider: 'instagram',
        stockNumber: item.stockNumber,
      });

      // Format the item for Instagram
      const message = formatBinderItemForInstagram(item);

      // Build link to item detail page if needed
      let linkUrl = null;
      if (item.stockNumber) {
        linkUrl = `https://tonkaintl.com/equipment/${item.stockNumber}`;
      }

      // Use createPost with formatted content
      return await this.createPost({
        linkUrl,
        mediaUrls: mediaUrls || item.images || [],
        message,
        pageIdOrHandle,
        utm,
      });
    } catch (error) {
      logger.error('Failed to create Instagram post from item', {
        error: error.message,
        provider: 'instagram',
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

  async createPostFromCampaign(campaign, _provider, options = {}) {
    try {
      const { mediaUrls = [], pageIdOrHandle } = options;

      logger.info('Creating Instagram post from campaign', {
        campaignId: campaign._id,
        mediaCount: mediaUrls.length,
        provider: 'instagram',
        stockNumber: campaign.stock_number,
      });

      // Generate dynamic content for Instagram
      const message = await this.generateInstagramContent(campaign);

      // Build link to item detail page
      const linkUrl = `https://tonkaintl.com/equipment/${campaign.stock_number}`;

      // Use createPost with generated content
      return await this.createPost({
        linkUrl,
        mediaUrls,
        message,
        pageIdOrHandle,
      });
    } catch (error) {
      logger.error('Failed to create Instagram post from campaign', {
        campaignId: campaign._id,
        error: error.message,
        provider: 'instagram',
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
   * Generate Instagram-specific content from campaign data
   */
  async generateInstagramContent(campaign) {
    // Use campaign title and description as base
    let content = `🚗 ${campaign.title}\n\n`;

    if (campaign.description) {
      content += `${campaign.description}\n\n`;
    }

    // Add key details from Binder data if available
    if (campaign.binder_data) {
      const { make, mileage, model, price, year } = campaign.binder_data;

      if (year && make && model) {
        content += `Vehicle: ${year} ${make} ${model}\n`;
      }

      if (price) {
        content += `💰 ${price}\n`;
      }

      if (mileage) {
        content += `📍 ${mileage} miles\n`;
      }
    }

    // Add Instagram-friendly hashtags
    content += '\n#cars #automotive #forsale #tonkaintl #instagram';

    return content;
  }

  async fetchPosts(_input) {
    try {
      logger.info('Fetching Instagram posts', {
        provider: 'instagram',
      });

      // TODO: Implement Instagram post fetching

      return [];
    } catch (error) {
      logger.error('Failed to fetch Instagram posts', {
        error: error.message,
        provider: 'instagram',
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to fetch Instagram posts: ${error.message}`,
        500
      );
    }
  }

  async handleOAuthCallback(params, _req) {
    try {
      const { code } = params;

      // TODO: Implement Instagram OAuth callback
      logger.info('Instagram OAuth callback received', {
        hasCode: !!code,
      });

      return {
        message: 'Instagram OAuth not yet implemented',
      };
    } catch (error) {
      logger.error('Failed to process Instagram OAuth callback', {
        error: error.message,
      });

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to process Instagram OAuth callback: ${error.message}`,
        500
      );
    }
  }

  async handleWebhook(req) {
    try {
      // Handle GET request for webhook verification
      if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (
          mode === 'subscribe' &&
          token === this.config.INSTAGRAM_VERIFY_TOKEN
        ) {
          logger.info('Instagram webhook verified successfully');
          return { challenge };
        } else {
          throw new ApiError(
            ERROR_CODES.PROVIDER_AUTH_FAILED,
            'Invalid Instagram webhook verification token',
            403
          );
        }
      }

      // Handle POST request with webhook events
      logger.info('Instagram webhook received', {
        provider: 'instagram',
      });

      // TODO: Implement Instagram webhook processing

      return [];
    } catch (error) {
      logger.error('Failed to process Instagram webhook', {
        error: error.message,
        provider: 'instagram',
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to process Instagram webhook: ${error.message}`,
        500
      );
    }
  }
}
