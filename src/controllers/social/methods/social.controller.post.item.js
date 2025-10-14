import { z } from 'zod';

import { BinderAdapter } from '../../../adapters/binder/binder.adapter.js';
import { LinkedInAdapter } from '../../../adapters/linkedin/linkedin.adapter.js';
import { MetaAdapter } from '../../../adapters/meta/meta.adapter.js';
import { RedditAdapter } from '../../../adapters/reddit/reddit.adapter.js';
import { XAdapter } from '../../../adapters/x/x.adapter.js';
import { config } from '../../../config/env.js';
import { ERROR_CODES } from '../../../constants/errors.js';
import { logger } from '../../../utils/logger.js';

const SUPPORTED_PROVIDERS = ['meta', 'linkedin', 'x', 'reddit'];

const adapters = {
  linkedin: new LinkedInAdapter(config),
  meta: new MetaAdapter(config),
  reddit: new RedditAdapter(config),
  x: new XAdapter(config),
};

// Request validation schema
const postItemSchema = z.object({
  mediaUrls: z.array(z.string().url()).optional(),
  pageIdOrHandle: z.string().optional(),
  provider: z.enum(SUPPORTED_PROVIDERS),
  stockNumber: z.string().min(1),
  utm: z
    .object({
      campaign: z.string().optional(),
      content: z.string().optional(),
      medium: z.string().optional(),
      source: z.string().optional(),
      term: z.string().optional(),
    })
    .optional(),
});

/**
 * POST /api/social/post-item
 * Fetch equipment item and post to social media
 */
export const postItemToSocial = async (req, res, next) => {
  try {
    const { mediaUrls, pageIdOrHandle, provider, stockNumber, utm } =
      postItemSchema.parse(req.body);

    logger.info('Post item to social request', {
      provider,
      requestId: req.id,
      stockNumber,
    });

    // Fetch item from Binder
    const binderAdapter = new BinderAdapter(config);
    const item = await binderAdapter.getItem(stockNumber);

    // Post to the social platform
    const adapter = adapters[provider];
    const result = await adapter.createPostFromItem(item, {
      mediaUrls,
      pageIdOrHandle,
      utm,
    });

    logger.info('Item posted to social', {
      provider,
      requestId: req.id,
      status: result.status,
      stockNumber,
    });

    const statusCode = result.status === 'success' ? 200 : 500;

    return res.status(statusCode).json({
      ...result,
      provider,
      requestId: req.id,
      stockNumber,
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
