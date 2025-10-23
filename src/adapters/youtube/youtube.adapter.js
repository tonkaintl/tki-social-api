import { ApiError, ERROR_CODES } from '../../constants/errors.js';
import { logger } from '../../utils/logger.js';
import { SocialAdapter } from '../adapter.types.js';

import { formatBinderItemForYouTube } from './formatters/binder-item.formatter.js';
import { YouTubeClient } from './youtube.client.js';

export class YouTubeAdapter extends SocialAdapter {
  constructor(config) {
    super('youtube', config);
    this.client = new YouTubeClient(config);

    this.requiredConfig = [
      'YOUTUBE_CLIENT_ID',
      'YOUTUBE_CLIENT_SECRET',
      'YOUTUBE_ACCESS_TOKEN',
    ];
  }

  async validateConfig() {
    const missing = this.requiredConfig.filter(key => !this.config[key]);

    if (missing.length > 0) {
      throw new ApiError(
        ERROR_CODES.PROVIDER_CONFIG_MISSING,
        `YouTube adapter missing required configuration: ${missing.join(', ')}`,
        500
      );
    }

    // Test the access token
    try {
      await this.client.get('/channels', {
        mine: true,
        part: 'snippet',
      });
      return true;
    } catch (error) {
      logger.error('YouTube config validation failed', {
        error: error.message,
      });
      throw new ApiError(
        ERROR_CODES.PROVIDER_AUTH_FAILED,
        'YouTube access token validation failed',
        401
      );
    }
  }

  async createPost(input) {
    try {
      const { mediaUrls = [] } = input;

      logger.info('Creating YouTube post', {
        hasMedia: mediaUrls.length > 0,
        provider: 'youtube',
      });

      // YouTube requires video content
      if (!mediaUrls || mediaUrls.length === 0) {
        throw new ApiError(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'YouTube posts require at least one video URL',
          400
        );
      }

      // TODO: Implement YouTube posting logic

      return {
        externalPostId: null,
        permalink: null,
        raw: { message: 'YouTube posting not yet implemented' },
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to create YouTube post', {
        error: error.message,
        provider: 'youtube',
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

      // TODO: Implement YouTube comment creation
      logger.info('Creating YouTube comment', {
        postId: threadIdOrPostId,
        provider: 'youtube',
      });

      return {
        externalCommentId: null,
        raw: { message: 'YouTube commenting not yet implemented' },
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to create YouTube comment', {
        error: error.message,
        postId: input.threadIdOrPostId,
        provider: 'youtube',
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

      logger.info('Creating YouTube post from binder item', {
        provider: 'youtube',
        stockNumber: item.stockNumber,
      });

      // Format the item for YouTube
      const message = formatBinderItemForYouTube(item);

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
      logger.error('Failed to create YouTube post from item', {
        error: error.message,
        provider: 'youtube',
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

      logger.info('Creating YouTube post from campaign', {
        campaignId: campaign._id,
        mediaCount: mediaUrls.length,
        provider: 'youtube',
        stockNumber: campaign.stock_number,
      });

      // Generate dynamic content for YouTube
      const message = await this.generateYouTubeContent(campaign);

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
      logger.error('Failed to create YouTube post from campaign', {
        campaignId: campaign._id,
        error: error.message,
        provider: 'youtube',
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
   * Generate YouTube-specific content from campaign data
   */
  async generateYouTubeContent(campaign) {
    // Use campaign title and description as base
    let content = `${campaign.title}\n\n`;

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
        content += `Price: ${price}\n`;
      }

      if (mileage) {
        content += `Mileage: ${mileage} miles\n`;
      }
    }

    // Add YouTube-friendly call to action
    content += '\n🔗 Visit our website for more details!\n';
    content += 'www.tonkaintl.com\n\n';

    // Add tags
    content += '#cars #automotive #forsale #tonkaintl #usedcars';

    return content;
  }

  async fetchPosts(_input) {
    try {
      logger.info('Fetching YouTube posts', {
        provider: 'youtube',
      });

      // TODO: Implement YouTube post fetching

      return [];
    } catch (error) {
      logger.error('Failed to fetch YouTube posts', {
        error: error.message,
        provider: 'youtube',
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to fetch YouTube posts: ${error.message}`,
        500
      );
    }
  }

  async handleOAuthCallback(params, _req) {
    try {
      const { code } = params;

      // TODO: Implement YouTube OAuth callback
      logger.info('YouTube OAuth callback received', {
        hasCode: !!code,
      });

      return {
        message: 'YouTube OAuth not yet implemented',
      };
    } catch (error) {
      logger.error('Failed to process YouTube OAuth callback', {
        error: error.message,
      });

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to process YouTube OAuth callback: ${error.message}`,
        500
      );
    }
  }

  async handleWebhook(req) {
    try {
      // YouTube uses PubSubHubbub for webhooks
      logger.info('YouTube webhook received', {
        method: req.method,
        provider: 'youtube',
      });

      // TODO: Implement YouTube webhook processing

      return [];
    } catch (error) {
      logger.error('Failed to process YouTube webhook', {
        error: error.message,
        provider: 'youtube',
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to process YouTube webhook: ${error.message}`,
        500
      );
    }
  }
}
