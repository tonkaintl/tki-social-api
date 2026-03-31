import { readFile } from 'node:fs/promises';
import path from 'node:path';

import axios from 'axios';
import { JWT } from 'google-auth-library';

import { config } from '../config/env.js';
import { ApiError, ERROR_CODES } from '../constants/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Service for sending emails via Gmail API delegated auth over SMTP.
 */
class EmailService {
  constructor() {
    this.fromEmail = config.GMAIL_FROM_EMAIL;
    this.fromName = config.GMAIL_FROM_NAME;
    this.impersonatedUser = config.GMAIL_IMPERSONATED_USER;
    this.serviceAccountJsonBase64 = config.GMAIL_SERVICE_ACCOUNT_JSON_BASE64;
    this.serviceAccountFile = config.GMAIL_SERVICE_ACCOUNT_FILE;
    this.gmailScope = 'https://www.googleapis.com/auth/gmail.send';
  }

  /**
   * Read and parse the configured Google service account file.
   */
  async getServiceAccountCredentials() {
    try {
      let credentials;

      if (this.serviceAccountJsonBase64) {
        const decodedJson = Buffer.from(
          this.serviceAccountJsonBase64,
          'base64'
        ).toString('utf8');
        credentials = JSON.parse(decodedJson);
      } else {
        if (!this.serviceAccountFile) {
          throw new Error(
            'Missing Gmail credentials: set GMAIL_SERVICE_ACCOUNT_JSON_BASE64 or GMAIL_SERVICE_ACCOUNT_FILE'
          );
        }

        const resolvedPath = path.resolve(
          process.cwd(),
          this.serviceAccountFile
        );
        const fileContent = await readFile(resolvedPath, 'utf8');
        credentials = JSON.parse(fileContent);
      }

      if (!credentials.client_email || !credentials.private_key) {
        throw new Error(
          'Service account file is missing client_email or private_key'
        );
      }

      return credentials;
    } catch (error) {
      logger.error('Failed to read Gmail service account credentials', {
        error: error.message,
        serviceAccountFile: this.serviceAccountFile,
        usingBase64: Boolean(this.serviceAccountJsonBase64),
      });
      throw new ApiError(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        'Failed to load Gmail service account credentials',
        500
      );
    }
  }

  /**
   * Get OAuth2 access token for Gmail delegated sending.
   */
  async getAccessToken() {
    try {
      if (!this.impersonatedUser) {
        throw new Error('GMAIL_IMPERSONATED_USER not configured');
      }

      const credentials = await this.getServiceAccountCredentials();

      const jwtClient = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: [this.gmailScope],
        subject: this.impersonatedUser,
      });

      const tokenResponse = await jwtClient.authorize();

      if (!tokenResponse.access_token) {
        throw new Error('No Gmail access token returned by Google OAuth');
      }

      logger.debug('Gmail delegated access token obtained successfully');

      return tokenResponse.access_token;
    } catch (error) {
      logger.error('Failed to obtain Gmail delegated access token', {
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
   * Send an email via Gmail SMTP using OAuth2 access token.
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.htmlBody - HTML email body
   * @returns {Promise<Object>} - Success response
   */
  async sendEmail({ htmlBody, subject, to }) {
    try {
      if (!this.fromEmail) {
        throw new Error('GMAIL_FROM_EMAIL not configured');
      }
      if (!this.impersonatedUser) {
        throw new Error('GMAIL_IMPERSONATED_USER not configured');
      }

      const recipients = Array.isArray(to) ? to.join(', ') : to;

      const accessToken = await this.getAccessToken();

      const mimeMessage = [
        `From: ${
          this.fromName
            ? `${this.fromName} <${this.fromEmail}>`
            : this.fromEmail
        }`,
        `To: ${recipients}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        '',
        htmlBody,
      ].join('\r\n');

      const encodedMessage = Buffer.from(mimeMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');

      logger.debug('Sending email via Gmail delegated SMTP', {
        recipient: recipients,
        sender: this.fromEmail,
        subject,
      });

      await axios.post(
        `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(this.impersonatedUser)}/messages/send`,
        {
          raw: encodedMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Email sent successfully via Gmail API', {
        recipient: recipients,
        subject,
      });

      return {
        message: 'Email sent successfully',
        success: true,
      };
    } catch (error) {
      logger.error('Failed to send email via Gmail API', {
        error: error.response?.data || error.message,
        recipient: to,
        subject,
      });

      throw new ApiError(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        `Failed to send email: ${error.message}`,
        500
      );
    }
  }

  /**
   * Health check for email service
   */
  async healthCheck() {
    try {
      await this.getAccessToken();
      return {
        configured: Boolean(this.fromEmail && this.impersonatedUser),
        senderEmail: this.fromEmail,
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
