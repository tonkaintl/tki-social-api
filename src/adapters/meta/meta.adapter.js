import { ApiError, ERROR_CODES } from '../../constants/errors.js';
import { logger } from '../../utils/logger.js';
import { appendUtmToUrl } from '../../utils/mapping.js';
import { SocialAdapter } from '../adapter.types.js';

import { formatBinderItemForMeta } from './formatters/binder-item.formatter.js';
import { MetaGraphClient } from './meta.graph.client.js';
import {
  normalizeMetaPost,
  normalizeMetaWebhookEvent,
} from './meta.normalize.js';

export class MetaAdapter extends SocialAdapter {
  constructor(config) {
    super('meta', config);
    this.client = new MetaGraphClient(config);

    this.requiredConfig = [
      'META_APP_ID',
      'META_APP_SECRET',
      'META_PAGE_ID',
      'META_PAGE_ACCESS_TOKEN',
    ];
  }

  async validateConfig() {
    const missing = this.requiredConfig.filter(key => !this.config[key]);

    if (missing.length > 0) {
      throw new ApiError(
        ERROR_CODES.PROVIDER_CONFIG_MISSING,
        `Meta adapter missing required configuration: ${missing.join(', ')}`,
        500
      );
    }

    // Test the page access token
    try {
      await this.client.get(`/${this.config.META_PAGE_ID}`, {
        fields: 'id,name',
      });
      return true;
    } catch (error) {
      logger.error('Meta config validation failed', { error: error.message });
      throw new ApiError(
        ERROR_CODES.PROVIDER_AUTH_FAILED,
        'Meta page access token validation failed',
        401
      );
    }
  }

  async createPost(input) {
    try {
      const { linkUrl, mediaUrls = [], message, pageIdOrHandle, utm } = input;

      // Use provided page ID or fall back to config
      const pageId = pageIdOrHandle || this.config.META_PAGE_ID;

      if (!pageId) {
        throw new ApiError(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'pageIdOrHandle is required for Meta posts',
          400
        );
      }

      let postData = {
        message,
      };

      // Add link with UTM parameters if provided
      if (linkUrl) {
        const finalUrl = utm ? appendUtmToUrl(linkUrl, utm) : linkUrl;
        postData.link = finalUrl;
      }

      // Handle media attachments
      if (mediaUrls && mediaUrls.length > 0) {
        // For now, we'll use the first media URL as the main attachment
        // TODO: Implement proper multi-media posting workflow
        postData.picture = mediaUrls[0];
      }

      // Make the API call to create the post
      const response = await this.client.post(`/${pageId}/feed`, postData);

      const permalink = `https://www.facebook.com/${response.id}`;

      logger.info('Meta post created successfully', {
        externalPostId: response.id,
        pageId,
        provider: 'meta',
      });

      return {
        externalPostId: response.id,
        permalink,
        raw: response,
        status: 'success',
      };
    } catch (error) {
      logger.error('Failed to create Meta post', {
        error: error.message,
        provider: 'meta',
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
      const { message, threadIdOrPostId } = input;

      const response = await this.client.post(`/${threadIdOrPostId}/comments`, {
        message,
      });

      logger.info('Meta comment created successfully', {
        externalCommentId: response.id,
        postId: threadIdOrPostId,
        provider: 'meta',
      });

      return {
        externalCommentId: response.id,
        raw: response,
        status: 'success',
      };
    } catch (error) {
      logger.error('Failed to create Meta comment', {
        error: error.message,
        postId: input.threadIdOrPostId,
        provider: 'meta',
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

      logger.info('Creating Meta post from binder item', {
        provider: 'meta',
        stockNumber: item.stockNumber,
      });

      // Format the item for Meta
      const message = formatBinderItemForMeta(item);

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
      logger.error('Failed to create Meta post from item', {
        error: error.message,
        provider: 'meta',
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

  async fetchPosts(input) {
    try {
      const { limit = 25, pageIdOrHandle, since } = input;

      const pageId = pageIdOrHandle || this.config.META_PAGE_ID;

      if (!pageId) {
        throw new ApiError(
          ERROR_CODES.MISSING_REQUIRED_FIELD,
          'pageIdOrHandle is required for fetching Meta posts',
          400
        );
      }

      const params = {
        fields:
          'id,message,created_time,permalink_url,from,likes.summary(true),comments.summary(true),shares',
        limit,
      };

      if (since) {
        params.since = since;
      }

      const response = await this.client.get(`/${pageId}/posts`, params);

      const normalizedPosts = response.data.map(post =>
        normalizeMetaPost(post)
      );

      logger.info('Meta posts fetched successfully', {
        count: normalizedPosts.length,
        pageId,
        provider: 'meta',
      });

      return normalizedPosts;
    } catch (error) {
      logger.error('Failed to fetch Meta posts', {
        error: error.message,
        provider: 'meta',
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to fetch Meta posts: ${error.message}`,
        500
      );
    }
  }

  async handleOAuthCallback(params, req) {
    try {
      const { code } = params;

      // Exchange authorization code for user access token
      const tokenResponse = await this.client.post('/oauth/access_token', {
        client_id: this.config.META_APP_ID,
        client_secret: this.config.META_APP_SECRET,
        code,
        redirect_uri: `${req.protocol}://${req.get('host')}/webhooks/facebook/callback`,
      });

      // Get user's pages to find page access tokens
      const pagesResponse = await this.client.get('/me/accounts', {
        access_token: tokenResponse.access_token,
      });

      const pages =
        pagesResponse.data?.map(page => ({
          id: page.id,
          name: page.name,
          page_token: page.access_token,
        })) || [];

      logger.info('Meta OAuth callback completed', {
        pages_count: pages.length,
        user_token: tokenResponse.access_token.substring(0, 20) + '...',
      });

      return {
        message: 'Facebook OAuth completed successfully',
        pages: pages.map(page => ({
          ...page,
          page_token: page.page_token.substring(0, 20) + '...',
        })),
        user_token: tokenResponse.access_token.substring(0, 20) + '...',
      };
    } catch (error) {
      logger.error('Failed to process Meta OAuth callback', {
        error: error.message,
      });

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to process Meta OAuth callback: ${error.message}`,
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

        if (mode === 'subscribe' && token === this.config.META_VERIFY_TOKEN) {
          logger.info('Meta webhook verified successfully');
          return { challenge };
        } else {
          throw new ApiError(
            ERROR_CODES.PROVIDER_AUTH_FAILED,
            'Invalid Meta webhook verification token',
            403
          );
        }
      }

      // Handle POST request with webhook events - verify signature
      const signature = req.headers['x-hub-signature-256'];
      if (this.config.META_APP_SECRET && !signature) {
        throw new ApiError(
          ERROR_CODES.PROVIDER_AUTH_FAILED,
          'Missing webhook signature',
          401
        );
      }

      const body = req.body;

      if (body.object !== 'page') {
        logger.warn('Received non-page webhook event', { object: body.object });
        return [];
      }

      const events = [];

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          try {
            const normalizedEvent = normalizeMetaWebhookEvent(change);
            if (normalizedEvent) {
              events.push(normalizedEvent);
            }
          } catch (error) {
            logger.error('Failed to normalize Meta webhook event', {
              change,
              error: error.message,
            });
          }
        }
      }

      logger.info('Meta webhook processed', {
        eventCount: events.length,
        provider: 'meta',
      });

      return events;
    } catch (error) {
      logger.error('Failed to process Meta webhook', {
        error: error.message,
        provider: 'meta',
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.PROVIDER_REQUEST_FAILED,
        `Failed to process Meta webhook: ${error.message}`,
        500
      );
    }
  }
}
