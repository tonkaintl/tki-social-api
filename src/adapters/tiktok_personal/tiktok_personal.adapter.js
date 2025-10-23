import { ApiError, ERROR_CODES } from '../../constants/errors.js';
import { logger } from '../../utils/logger.js';
import { SocialAdapter } from '../adapter.types.js';

import { formatBinderItemForTikTokPersonal } from './formatters/binder-item.formatter.js';
import { TikTokPersonalClient } from './tiktok_personal.client.js';

export class TikTokPersonalAdapter extends SocialAdapter {
  constructor(config) {
    super('tiktok_personal', config);
    this.client = new TikTokPersonalClient(config);

    this.requiredConfig = [
      'TIKTOK_PERSONAL_CLIENT_ID',
      'TIKTOK_PERSONAL_CLIENT_SECRET',
      'TIKTOK_PERSONAL_ACCESS_TOKEN',
    ];
  }

  async validateConfig() {
    const missing = this.requiredConfig.filter(key => !this.config[key]);

    if (missing.length > 0) {
      throw new ApiError(
        ERROR_CODES.PROVIDER_CONFIG_MISSING,
        `TikTok Personal adapter missing required configuration: ${missing.join(', ')}`,
        500
      );
    }

    // Test the access token
    try {
      await this.client.get('/user/info/', {});
      return true;
    } catch (error) {
      logger.error('TikTok Personal config validation failed', {
        error: error.message,
      });
      throw new ApiError(
        ERROR_CODES.PROVIDER_AUTH_FAILED,
        'TikTok Personal access token validation failed',
        401
      );
    }
  }

  async createPost(input) {
    try {
      const { mediaUrls = [] } = input;

      logger.info('Creating TikTok Personal post', {
        hasMedia: mediaUrls.length > 0,
        provider: 'tiktok_personal',
      });

      // TikTok requires video content
      if (!mediaUrls || mediaUrls.length === 0) {
        throw new ApiError(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'TikTok posts require at least one video URL',
          400
        );
      }

      // TODO: Implement TikTok Personal posting logic

      return {
        externalPostId: null,
        permalink: null,
        raw: { message: 'TikTok Personal posting not yet implemented' },
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to create TikTok Personal post', {
        error: error.message,
        provider: 'tiktok_personal',
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

      // TODO: Implement TikTok Personal comment creation
      logger.info('Creating TikTok Personal comment', {
        postId: threadIdOrPostId,
        provider: 'tiktok_personal',
      });

      return {
        externalCommentId: null,
        raw: { message: 'TikTok Personal commenting not yet implemented' },
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to create TikTok Personal comment', {
        error: error.message,
        postId: input.threadIdOrPostId,
        provider: 'tiktok_personal',
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

      logger.info('Creating TikTok Personal post from binder item', {
        provider: 'tiktok_personal',
        stockNumber: item.stockNumber,
      });

      // Format the item for TikTok
      const message = formatBinderItemForTikTokPersonal(item);

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
      logger.error('Failed to create TikTok Personal post from item', {
        error: error.message,
        provider: 'tiktok_personal',
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

      logger.info('Creating TikTok Personal post from campaign', {
        campaignId: campaign._id,
        mediaCount: mediaUrls.length,
        provider: 'tiktok_personal',
        stockNumber: campaign.stock_number,
      });

      // Generate dynamic content for TikTok
      const message = await this.generateTikTokPersonalContent(campaign);

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
      logger.error('Failed to create TikTok Personal post from campaign', {
        campaignId: campaign._id,
        error: error.message,
        provider: 'tiktok_personal',
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
   * Generate TikTok Personal-specific content from campaign data
   */
  async generateTikTokPersonalContent(campaign) {
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

    // Add TikTok hashtags
    content += '\n#cars #automotive #forsale #tonkaintl #tiktok';

    return content;
  }

  async fetchPosts(_input) {
    try {
      logger.info('Fetching TikTok Personal posts', {
        provider: 'tiktok_personal',
      });

      // TODO: Implement TikTok Personal post fetching

      return [];
    } catch (error) {
      logger.error('Failed to fetch TikTok Personal posts', {
        error: error.message,
        provider: 'tiktok_personal',
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to fetch TikTok Personal posts: ${error.message}`,
        500
      );
    }
  }

  async handleOAuthCallback(params, _req) {
    try {
      const { code } = params;

      // TODO: Implement TikTok Personal OAuth callback
      logger.info('TikTok Personal OAuth callback received', {
        hasCode: !!code,
      });

      return {
        message: 'TikTok Personal OAuth not yet implemented',
      };
    } catch (error) {
      logger.error('Failed to process TikTok Personal OAuth callback', {
        error: error.message,
      });

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to process TikTok Personal OAuth callback: ${error.message}`,
        500
      );
    }
  }

  async handleWebhook(req) {
    try {
      // TikTok Personal doesn't support webhooks in the same way
      logger.info('TikTok Personal webhook received', {
        method: req.method,
        provider: 'tiktok_personal',
      });

      // TODO: Implement TikTok Personal webhook processing if needed

      return [];
    } catch (error) {
      logger.error('Failed to process TikTok Personal webhook', {
        error: error.message,
        provider: 'tiktok_personal',
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to process TikTok Personal webhook: ${error.message}`,
        500
      );
    }
  }
}
