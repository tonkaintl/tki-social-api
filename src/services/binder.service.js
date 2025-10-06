import fetch from 'node-fetch';

import { config } from '../config/env.js';
import { ApiError, ERROR_CODES } from '../constants/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Service for interacting with the Binder API
 * Handles leads, conversations, and message routing
 */
class BinderService {
  constructor() {
    this.baseUrl = config.BINDER_API_URL;
    this.internalSecret = config.BINDER_INTERNAL_SECRET;
  }

  async makeRequest(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;

    const options = {
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': this.internalSecret,
      },
      method,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      logger.debug('Making Binder API request', {
        hasBody: !!options.body,
        method,
        url,
      });

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          ERROR_CODES.BINDER_REQUEST_FAILED,
          `Binder API request failed: ${response.status} ${errorText}`,
          response.status
        );
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      logger.error('Binder API request failed', {
        error: error.message,
        method,
        url,
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        `Failed to communicate with Binder service: ${error.message}`,
        500
      );
    }
  }

  /**
   * Upsert a lead in the Binder system
   */
  async upsertLead(leadData) {
    try {
      const response = await this.makeRequest(
        'POST',
        '/integrations/leads/upsert',
        leadData
      );

      logger.info('Lead upserted successfully', {
        leadId: response.id,
        source: leadData.source,
      });

      return response;
    } catch (error) {
      logger.error('Failed to upsert lead', {
        error: error.message,
        leadData,
      });
      throw error;
    }
  }

  /**
   * Upsert a conversation in the Binder system
   */
  async upsertConversation(conversationData) {
    try {
      const response = await this.makeRequest(
        'POST',
        '/integrations/conversations/upsert',
        conversationData
      );

      logger.info('Conversation upserted successfully', {
        conversationId: response.id,
        provider: conversationData.provider,
      });

      return response;
    } catch (error) {
      logger.error('Failed to upsert conversation', {
        conversationData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Log a social media post in the Binder system
   */
  async logPost(postData) {
    try {
      const response = await this.makeRequest(
        'POST',
        '/integrations/social/posts',
        postData
      );

      logger.info('Post logged successfully', {
        postId: response.id,
        provider: postData.provider,
      });

      return response;
    } catch (error) {
      logger.error('Failed to log post', {
        error: error.message,
        postData,
      });
      throw error;
    }
  }

  /**
   * Send a message through Binder's messaging system
   * NOTE: This calls Binder's own send endpoint (Binder ↔ Twilio)
   * We do NOT use Twilio directly here
   */
  async sendMessageThroughBinder(messageData) {
    try {
      const response = await this.makeRequest(
        'POST',
        '/integrations/messages/send',
        messageData
      );

      logger.info('Message sent through Binder successfully', {
        messageId: response.id,
        provider: messageData.provider,
        recipient: messageData.to,
      });

      return response;
    } catch (error) {
      logger.error('Failed to send message through Binder', {
        error: error.message,
        messageData,
      });
      throw error;
    }
  }

  /**
   * Health check for Binder service
   */
  async healthCheck() {
    try {
      const response = await this.makeRequest('GET', '/health');
      return response;
    } catch (error) {
      logger.error('Binder health check failed', {
        error: error.message,
      });
      throw error;
    }
  }
}

// Singleton instance
const binderService = new BinderService();

export { binderService };
