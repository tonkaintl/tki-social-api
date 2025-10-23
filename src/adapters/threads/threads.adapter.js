import { ApiError, ERROR_CODES } from '../../constants/errors.js';
import { logger } from '../../utils/logger.js';
import { SocialAdapter } from '../adapter.types.js';

import { formatBinderItemForThreads } from './formatters/binder-item.formatter.js';
import { ThreadsClient } from './threads.client.js';

export class ThreadsAdapter extends SocialAdapter {
  constructor(config) {
    super('threads', config);
    this.client = new ThreadsClient(config);

    this.requiredConfig = [
      'THREADS_CLIENT_ID',
      'THREADS_CLIENT_SECRET',
      'THREADS_ACCESS_TOKEN',
    ];
  }

  async validateConfig() {
    const missing = this.requiredConfig.filter(key => !this.config[key]);

    if (missing.length > 0) {
      throw new ApiError(
        ERROR_CODES.PROVIDER_CONFIG_MISSING,
        `Threads adapter missing required configuration: ${missing.join(', ')}`,
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
      logger.error('Threads config validation failed', {
        error: error.message,
      });
      throw new ApiError(
        ERROR_CODES.PROVIDER_AUTH_FAILED,
        'Threads access token validation failed',
        401
      );
    }
  }

  async createPost(input) {
    try {
      const {
        _linkUrl,
        _mediaUrls = [],
        _pageIdOrHandle,
        _utm,
        message,
      } = input;

      logger.info('Creating Threads post', {
        provider: 'threads',
      });

      // TODO: Implement Threads posting logic
      logger.debug('Threads post data', { message });

      return {
        externalPostId: null,
        permalink: null,
        raw: { message: 'Threads posting not yet implemented' },
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to create Threads post', {
        error: error.message,
        provider: 'threads',
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
      const { _message, threadIdOrPostId } = input;

      // TODO: Implement Threads comment creation
      logger.info('Creating Threads comment', {
        postId: threadIdOrPostId,
        provider: 'threads',
      });

      return {
        externalCommentId: null,
        raw: { message: 'Threads commenting not yet implemented' },
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to create Threads comment', {
        error: error.message,
        postId: input.threadIdOrPostId,
        provider: 'threads',
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

      logger.info('Creating Threads post from binder item', {
        provider: 'threads',
        stockNumber: item.stockNumber,
      });

      // Format the item for Threads
      const message = formatBinderItemForThreads(item);

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
      logger.error('Failed to create Threads post from item', {
        error: error.message,
        provider: 'threads',
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

      logger.info('Creating Threads post from campaign', {
        campaignId: campaign._id,
        mediaCount: mediaUrls.length,
        provider: 'threads',
        stockNumber: campaign.stock_number,
      });

      // Generate dynamic content for Threads
      const message = await this.generateThreadsContent(campaign);

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
      logger.error('Failed to create Threads post from campaign', {
        campaignId: campaign._id,
        error: error.message,
        provider: 'threads',
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
   * Generate Threads-specific content from campaign data
   */
  async generateThreadsContent(campaign) {
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
        content += `💰 ${price}\n`;
      }

      if (mileage) {
        content += `📍 ${mileage} miles\n`;
      }
    }

    // Add Threads-friendly call to action
    content += '\n🔗 Link in bio for details!';

    return content;
  }

  async fetchPosts(input) {
    try {
      const { _limit = 25, _pageIdOrHandle, _since } = input;

      logger.info('Fetching Threads posts', {
        provider: 'threads',
      });

      // TODO: Implement Threads post fetching

      return [];
    } catch (error) {
      logger.error('Failed to fetch Threads posts', {
        error: error.message,
        provider: 'threads',
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to fetch Threads posts: ${error.message}`,
        500
      );
    }
  }

  async handleOAuthCallback(params, _req) {
    try {
      const { code } = params;

      // TODO: Implement Threads OAuth callback
      logger.info('Threads OAuth callback received', {
        hasCode: !!code,
      });

      return {
        message: 'Threads OAuth not yet implemented',
      };
    } catch (error) {
      logger.error('Failed to process Threads OAuth callback', {
        error: error.message,
      });

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to process Threads OAuth callback: ${error.message}`,
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
          token === this.config.THREADS_VERIFY_TOKEN
        ) {
          logger.info('Threads webhook verified successfully');
          return { challenge };
        } else {
          throw new ApiError(
            ERROR_CODES.PROVIDER_AUTH_FAILED,
            'Invalid Threads webhook verification token',
            403
          );
        }
      }

      // Handle POST request with webhook events
      logger.info('Threads webhook received', {
        provider: 'threads',
      });

      // TODO: Implement Threads webhook processing

      return [];
    } catch (error) {
      logger.error('Failed to process Threads webhook', {
        error: error.message,
        provider: 'threads',
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to process Threads webhook: ${error.message}`,
        500
      );
    }
  }
}
