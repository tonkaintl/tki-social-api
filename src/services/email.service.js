import { ClientSecretCredential } from '@azure/identity';
import axios from 'axios';

import { config } from '../config/env.js';
import { ApiError, ERROR_CODES } from '../constants/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Service for sending emails via Microsoft Graph API
 * Handles authentication and email delivery through Azure AD
 */
class EmailService {
  constructor() {
    this.graphApiUrl = config.AZURE_GRAPH_API;
    this.senderEmail = config.AZURE_EMAIL_SENDER;
    this.tenantId = config.AZURE_TENANT_ID;
    this.clientId = config.AZURE_EMAIL_CLIENT_ID;
    this.clientSecret = config.AZURE_CLIENT_SECRET;
  }

  /**
   * Get Microsoft Graph API access token
   */
  async getAccessToken() {
    try {
      if (!this.tenantId || !this.clientId || !this.clientSecret) {
        throw new Error(
          'Missing Azure credentials: AZURE_TENANT_ID, AZURE_CLIENT_ID, or AZURE_CLIENT_SECRET'
        );
      }

      const credential = new ClientSecretCredential(
        this.tenantId,
        this.clientId,
        this.clientSecret
      );

      const tokenResponse = await credential.getToken(
        'https://graph.microsoft.com/.default'
      );

      logger.debug('Microsoft Graph access token obtained successfully');

      return tokenResponse.token;
    } catch (error) {
      logger.error('Failed to obtain Microsoft Graph access token', {
        error: error.message,
      });
      throw new ApiError(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        'Failed to obtain email service access token',
        500
      );
    }
  }

  /**
   * Send an email via Microsoft Graph API
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.htmlBody - HTML email body
   * @returns {Promise<Object>} - Success response
   */
  async sendEmail({ htmlBody, subject, to }) {
    try {
      if (!this.senderEmail) {
        throw new Error('AZURE_EMAIL_SENDER not configured');
      }

      // Get fresh access token
      const accessToken = await this.getAccessToken();

      const emailData = {
        message: {
          body: {
            content: htmlBody,
            contentType: 'HTML',
          },
          from: {
            emailAddress: {
              address: this.senderEmail,
            },
          },
          subject,
          toRecipients: [
            {
              emailAddress: {
                address: String(to),
              },
            },
          ],
        },
        saveToSentItems: true,
      };

      logger.debug('Sending email via Microsoft Graph API', {
        recipient: to,
        sender: this.senderEmail,
        subject,
      });

      // Send email using Microsoft Graph API
      await axios.post(
        `${this.graphApiUrl}/users/${this.senderEmail}/sendMail`,
        emailData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Email sent successfully via Microsoft Graph API', {
        recipient: to,
        subject,
      });

      return {
        message: 'Email sent successfully',
        success: true,
      };
    } catch (error) {
      logger.error('Failed to send email via Microsoft Graph API', {
        error: error.response?.data || error.message,
        recipient: to,
        subject,
      });

      throw new ApiError(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        `Failed to send email: ${error.response?.data?.error?.message || error.message}`,
        500
      );
    }
  }

  /**
   * Health check for email service
   */
  async healthCheck() {
    try {
      // Just verify we can get an access token
      await this.getAccessToken();
      return {
        configured: true,
        senderEmail: this.senderEmail,
        status: 'healthy',
      };
    } catch (error) {
      return {
        configured: false,
        error: error.message,
        status: 'unhealthy',
      };
    }
  }
}

// Singleton instance
const emailService = new EmailService();

export { emailService };
