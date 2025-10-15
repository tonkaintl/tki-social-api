/**
 * Social Media Post Controller
 * Direct posting to social media platforms
 */

import { z } from 'zod';

import { LinkedInAdapter } from '../../../adapters/linkedin/linkedin.adapter.js';
import { MetaAdapter } from '../../../adapters/meta/meta.adapter.js';
import { RedditAdapter } from '../../../adapters/reddit/reddit.adapter.js';
import { XAdapter } from '../../../adapters/x/x.adapter.js';
import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import { PROVIDERS } from '../../../constants/providers.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const createPostSchema = z
  .object({
    additionalParams: z.record(z.any()).optional(),
    message: z.string().min(1, 'Message is required'),
    pageIdOrHandle: z.string().min(1, 'Page ID or handle is required'),
    provider: z
      .enum([PROVIDERS.META, PROVIDERS.LINKEDIN, PROVIDERS.X, PROVIDERS.REDDIT])
      .optional(),
    providers: z
      .array(
        z.enum([
          PROVIDERS.META,
          PROVIDERS.LINKEDIN,
          PROVIDERS.X,
          PROVIDERS.REDDIT,
        ])
      )
      .optional(),
  })
  .refine(data => data.provider || data.providers, {
    message: 'Either provider or providers must be specified',
  });

// ----------------------------------------------------------------------------
// Adapter Factory
// ----------------------------------------------------------------------------

const getAdapter = provider => {
  switch (provider) {
    case PROVIDERS.META:
      return new MetaAdapter();
    case PROVIDERS.LINKEDIN:
      return new LinkedInAdapter();
    case PROVIDERS.X:
      return new XAdapter();
    case PROVIDERS.REDDIT:
      return new RedditAdapter();
    default:
      throw new ApiError(
        ERROR_CODES.UNSUPPORTED_PROVIDER,
        `Unsupported provider: ${provider}`
      );
  }
};

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Create Social Media Post
 * POST /social/post
 */
export const createSocialPost = async (req, res) => {
  try {
    // Validate request
    const validation = createPostSchema.safeParse(req.body);
    if (!validation.success) {
      logger.warn('Invalid post creation request', {
        errors: validation.error.errors,
        requestId: req.id,
      });
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        ERROR_MESSAGES.INVALID_REQUEST_DATA,
        400,
        validation.error.errors
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
        errors: error.details,
      });
    }

    const { additionalParams, message, pageIdOrHandle, provider, providers } =
      validation.data;
    const targetProviders = providers || [provider];

    logger.info('Creating social media post', {
      message: message.substring(0, 50) + '...',
      pageIdOrHandle,
      providers: targetProviders,
      requestId: req.id,
    });

    // Handle single provider
    if (targetProviders.length === 1) {
      const adapter = getAdapter(targetProviders[0]);

      try {
        const result = await adapter.createPost({
          message,
          pageIdOrHandle,
          ...additionalParams,
        });

        logger.info('Post created successfully', {
          postId: result.externalPostId,
          provider: targetProviders[0],
          requestId: req.id,
        });

        return res.json({
          requestId: req.id,
          results: result,
          success: true,
        });
      } catch (error) {
        logger.error('Failed to create post', {
          error: error.message,
          provider: targetProviders[0],
          requestId: req.id,
        });

        const apiError = new ApiError(
          ERROR_CODES.PROVIDER_REQUEST_FAILED,
          'Failed to create post'
        );
        return res.status(apiError.statusCode).json({
          code: apiError.code,
          error: apiError.message,
          provider: targetProviders[0],
          requestId: req.id,
          success: false,
        });
      }
    }

    // Handle multiple providers
    const results = {};
    let hasSuccess = false;
    let hasFailure = false;

    for (const providerName of targetProviders) {
      try {
        const adapter = getAdapter(providerName);
        const result = await adapter.createPost({
          message,
          pageIdOrHandle,
          ...additionalParams,
        });

        results[providerName] = result;
        hasSuccess = true;

        logger.info('Post created for provider', {
          postId: result.externalPostId,
          provider: providerName,
          requestId: req.id,
        });
      } catch (error) {
        results[providerName] = {
          error: error.message,
          status: 'failed',
        };
        hasFailure = true;

        logger.error('Failed to create post for provider', {
          error: error.message,
          provider: providerName,
          requestId: req.id,
        });
      }
    }

    // Return appropriate status code
    const statusCode = hasSuccess && hasFailure ? 207 : hasSuccess ? 200 : 500;

    res.status(statusCode).json({
      requestId: req.id,
      results,
      success: hasSuccess,
    });
  } catch (error) {
    logger.error('Error in post creation controller', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
    res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      requestId: req.id,
      success: false,
    });
  }
};
