// ----------------------------------------------------------------------------
// GET /social/fetch
// Fetch posts from a social media platform
// ----------------------------------------------------------------------------

import { z } from 'zod';

import { LinkedInAdapter } from '../../../adapters/linkedin/linkedin.adapter.js';
import { MetaAdapter } from '../../../adapters/meta/meta.adapter.js';
import { RedditAdapter } from '../../../adapters/reddit/reddit.adapter.js';
import { XAdapter } from '../../../adapters/x/x.adapter.js';
import { config } from '../../../config/env.js';
import { ERROR_CODES } from '../../../constants/errors.js';
import { SUPPORTED_PROVIDERS } from '../../../constants/providers.js';
import { logger } from '../../../utils/logger.js';

// Initialize adapters
const adapters = {
  linkedin: new LinkedInAdapter(config),
  meta: new MetaAdapter(config),
  reddit: new RedditAdapter(config),
  x: new XAdapter(config),
};

// Request validation schema
const fetchRequestSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  pageIdOrHandle: z.string().min(1),
  provider: z.enum(SUPPORTED_PROVIDERS),
  since: z.string().optional(),
  until: z.string().optional(),
});

export const fetchSocialPosts = async (req, res, next) => {
  try {
    // ------------------------------------------------------------------------
    // VALIDATE QUERY PARAMETERS
    // ------------------------------------------------------------------------
    const queryData = fetchRequestSchema.parse(req.query);

    logger.info('Fetch request received', {
      limit: queryData.limit,
      pageIdOrHandle: queryData.pageIdOrHandle,
      provider: queryData.provider,
      requestId: req.id,
    });

    // ------------------------------------------------------------------------
    // GET ADAPTER AND FETCH POSTS
    // ------------------------------------------------------------------------
    const adapter = adapters[queryData.provider];
    if (!adapter) {
      return res.status(400).json({
        code: ERROR_CODES.UNSUPPORTED_PROVIDER,
        message: `Provider '${queryData.provider}' is not supported`,
        requestId: req.id,
      });
    }

    const result = await adapter.fetchPosts(queryData);

    // ------------------------------------------------------------------------
    // RETURN RESPONSE
    // ------------------------------------------------------------------------
    const responseStatus = result.status === 'success' ? 200 : 400;

    return res.status(responseStatus).json({
      requestId: req.id,
      result,
      success: result.status === 'success',
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
