import { ApiError, ERROR_CODES } from '../../constants/errors.js';
import { logger } from '../../utils/logger.js';
import { SocialAdapter } from '../adapter.types.js';

import { formatBinderItemForTikTokBusiness } from './formatters/binder-item.formatter.js';
import { TikTokBusinessClient } from './tiktok_business.client.js';

export class TikTokBusinessAdapter extends SocialAdapter {
  constructor(config) {
    super('tiktok_business', config);
    this.client = new TikTokBusinessClient(config);

    this.requiredConfig = [
      'TIKTOK_BUSINESS_CLIENT_ID',
      'TIKTOK_BUSINESS_CLIENT_SECRET',
      'TIKTOK_BUSINESS_ACCESS_TOKEN',
    ];
  }

  async validateConfig() {
    const missing = this.requiredConfig.filter(key => !this.config[key]);

    if (missing.length > 0) {
      throw new ApiError(
        ERROR_CODES.PROVIDER_CONFIG_MISSING,
        `TikTok Business adapter missing required configuration: ${missing.join(', ')}`,
        500
      );
    }

    // Test the access token
    try {
      await this.client.get('/user/info/', {});
      return true;
    } catch (error) {
      logger.error('TikTok Business config validation failed', {
        error: error.message,
      });
      throw new ApiError(
        ERROR_CODES.PROVIDER_AUTH_FAILED,
        'TikTok Business access token validation failed',
        401
      );
    }
  }

  async createPost(input) {
    try {
      const { mediaUrls = [] } = input;

      logger.info('Creating TikTok Business post', {
        hasMedia: mediaUrls.length > 0,
        provider: 'tiktok_business',
      });

      // TikTok requires video content
      if (!mediaUrls || mediaUrls.length === 0) {
        throw new ApiError(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'TikTok posts require at least one video URL',
          400
        );
      }

      // TODO: Implement TikTok Business posting logic

      return {
        externalPostId: null,
        permalink: null,
        raw: { message: 'TikTok Business posting not yet implemented' },
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to create TikTok Business post', {
        error: error.message,
        provider: 'tiktok_business',
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

      // TODO: Implement TikTok Business comment creation
      logger.info('Creating TikTok Business comment', {
        postId: threadIdOrPostId,
        provider: 'tiktok_business',
      });

      return {
        externalCommentId: null,
        raw: { message: 'TikTok Business commenting not yet implemented' },
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to create TikTok Business comment', {
        error: error.message,
        postId: input.threadIdOrPostId,
        provider: 'tiktok_business',
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

      logger.info('Creating TikTok Business post from binder item', {
        provider: 'tiktok_business',
        stockNumber: item.stockNumber,
      });

      // Format the item for TikTok
      const message = formatBinderItemForTikTokBusiness(item);

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
      logger.error('Failed to create TikTok Business post from item', {
        error: error.message,
        provider: 'tiktok_business',
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

      logger.info('Creating TikTok Business post from campaign', {
        campaignId: campaign._id,
        mediaCount: mediaUrls.length,
        provider: 'tiktok_business',
        stockNumber: campaign.stock_number,
      });

      // Generate dynamic content for TikTok
      const message = await this.generateTikTokBusinessContent(campaign);

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
      logger.error('Failed to create TikTok Business post from campaign', {
        campaignId: campaign._id,
        error: error.message,
        provider: 'tiktok_business',
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
   * Generate TikTok Business-specific content from campaign data
   */
  async generateTikTokBusinessContent(campaign) {
    // Use campaign title and description as base
    let content = `${campaign.title}\n\n`;

    if (campaign.description) {
      content += `${campaign.description}\n\n`;
    }

    // Add key details from Binder data if available
    if (campaign.binder_data) {
      const { make, mileage, model, price, year } = campaign.binder_data;

      if (year && make && model) {
        content += `${year} ${make} ${model}\n`;
      }

      if (price) {
        content += `💰 ${price}\n`;
      }

      if (mileage) {
        content += `📍 ${mileage} miles\n`;
      }
    }

    // Add TikTok Business hashtags
    content += '\n#business #cars #automotive #forsale #tonkaintl';

    return content;
  }

  async fetchPosts(_input) {
    try {
      logger.info('Fetching TikTok Business posts', {
        provider: 'tiktok_business',
      });

      // TODO: Implement TikTok Business post fetching

      return [];
    } catch (error) {
      logger.error('Failed to fetch TikTok Business posts', {
        error: error.message,
        provider: 'tiktok_business',
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to fetch TikTok Business posts: ${error.message}`,
        500
      );
    }
  }

  async handleOAuthCallback(params, _req) {
    try {
      const { code } = params;

      // TODO: Implement TikTok Business OAuth callback
      logger.info('TikTok Business OAuth callback received', {
        hasCode: !!code,
      });

      return {
        message: 'TikTok Business OAuth not yet implemented',
      };
    } catch (error) {
      logger.error('Failed to process TikTok Business OAuth callback', {
        error: error.message,
      });

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to process TikTok Business OAuth callback: ${error.message}`,
        500
      );
    }
  }

  async handleWebhook(req) {
    try {
      // TikTok Business doesn't support webhooks in the same way
      logger.info('TikTok Business webhook received', {
        method: req.method,
        provider: 'tiktok_business',
      });

      // TODO: Implement TikTok Business webhook processing if needed

      return [];
    } catch (error) {
      logger.error('Failed to process TikTok Business webhook', {
        error: error.message,
        provider: 'tiktok_business',
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to process TikTok Business webhook: ${error.message}`,
        500
      );
    }
  }
}
