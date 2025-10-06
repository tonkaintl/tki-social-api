// ----------------------------------------------------------------------------
// POST /social/post
// Create a social media post on one or multiple platforms
// ----------------------------------------------------------------------------

import { z } from 'zod';

import { LinkedInAdapter } from '../../../adapters/linkedin/linkedin.adapter.js';
import { MetaAdapter } from '../../../adapters/meta/meta.adapter.js';
import { RedditAdapter } from '../../../adapters/reddit/reddit.adapter.js';
import { XAdapter } from '../../../adapters/x/x.adapter.js';
import { config } from '../../../config/env.js';
import { ERROR_CODES } from '../../../constants/errors.js';
import { SUPPORTED_PROVIDERS } from '../../../constants/providers.js';
import { binderService } from '../../../services/binder.service.js';
import { idempotencyStore } from '../../../utils/idempotencyStore.js';
import { logger } from '../../../utils/logger.js';

// Initialize adapters
const adapters = {
  linkedin: new LinkedInAdapter(config),
  meta: new MetaAdapter(config),
  reddit: new RedditAdapter(config),
  x: new XAdapter(config),
};

// Request validation schemas
const singleProviderSchema = z.object({
  linkUrl: z.string().url().optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  message: z.string().min(1).max(4000),
  pageIdOrHandle: z.string().min(1),
  provider: z.enum(SUPPORTED_PROVIDERS),
  tags: z.array(z.string()).optional(),
  utm: z.record(z.string()).optional(),
});

const multiProviderSchema = z.object({
  linkUrl: z.string().url().optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  message: z.string().min(1).max(4000),
  pageIdOrHandle: z.string().min(1),
  providers: z.array(z.enum(SUPPORTED_PROVIDERS)).min(1).max(4),
  tags: z.array(z.string()).optional(),
  utm: z.record(z.string()).optional(),
});

const postRequestSchema = z.union([singleProviderSchema, multiProviderSchema]);

export const createSocialPost = async (req, res, next) => {
  try {
    // ------------------------------------------------------------------------
    // VALIDATE REQUEST BODY
    // ------------------------------------------------------------------------
    const requestData = postRequestSchema.parse(req.body);

    // ------------------------------------------------------------------------
    // DETERMINE PROVIDERS
    // ------------------------------------------------------------------------
    const isMultiProvider = 'providers' in requestData;
    const targetProviders = isMultiProvider
      ? requestData.providers
      : [requestData.provider];

    logger.info('Post request received', {
      isMultiProvider,
      providers: targetProviders,
      requestId: req.id,
    });

    // ------------------------------------------------------------------------
    // PROCESS EACH PROVIDER
    // ------------------------------------------------------------------------
    const results = {};

    for (const provider of targetProviders) {
      try {
        const adapter = adapters[provider];
        if (!adapter) {
          results[provider] = {
            externalPostId: null,
            permalink: null,
            provider,
            raw: { error: `Adapter not found for provider: ${provider}` },
            status: 'failed',
          };
          continue;
        }

        // Generate idempotency key
        const idempotencyKey = idempotencyStore.generateKey(
          provider,
          requestData
        );

        // Check if we've already processed this request
        if (idempotencyStore.has(idempotencyKey)) {
          const cachedResult = idempotencyStore.get(idempotencyKey);
          logger.info('Returning cached result for idempotent request', {
            idempotencyKey,
            provider,
            requestId: req.id,
          });
          results[provider] = cachedResult;
          continue;
        }

        // Create the post
        const result = await adapter.createPost(requestData);

        // Cache the result
        idempotencyStore.set(idempotencyKey, result);

        results[provider] = result;

        // Log successful post to Binder
        if (result.status === 'success') {
          try {
            await binderService.logPost({
              externalPostId: result.externalPostId,
              message: requestData.message,
              permalink: result.permalink,
              provider,
              raw: result.raw,
            });
          } catch (binderError) {
            logger.warn('Failed to log post to Binder', {
              binderError: binderError.message,
              postId: result.externalPostId,
              provider,
              requestId: req.id,
            });
          }
        }
      } catch (providerError) {
        logger.error('Provider-specific error', {
          error: providerError.message,
          provider,
          requestId: req.id,
        });

        results[provider] = {
          externalPostId: null,
          permalink: null,
          provider,
          raw: { error: providerError.message },
          status: 'failed',
        };
      }
    }

    // ------------------------------------------------------------------------
    // RETURN SUCCESS
    // ------------------------------------------------------------------------
    const hasAnySuccess = Object.values(results).some(
      result => result.status === 'success'
    );
    const hasAnyFailure = Object.values(results).some(
      result => result.status === 'failed'
    );

    const responseStatus = hasAnySuccess ? (hasAnyFailure ? 207 : 200) : 400;

    return res.status(responseStatus).json({
      requestId: req.id,
      results: isMultiProvider ? results : results[requestData.provider],
      success: hasAnySuccess,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        code: ERROR_CODES.VALIDATION_ERROR,
        errors: error.errors,
        message: 'Request validation failed',
        requestId: req.id,
      });
    }

    next(error);
  }
};
