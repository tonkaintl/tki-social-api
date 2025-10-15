// ----------------------------------------------------------------------------
// POST /social/comment
// Create a comment on a social media post
// ----------------------------------------------------------------------------
// trigger publish
import { z } from 'zod';

import { LinkedInAdapter } from '../../../adapters/linkedin/linkedin.adapter.js';
import { MetaAdapter } from '../../../adapters/meta/meta.adapter.js';
import { RedditAdapter } from '../../../adapters/reddit/reddit.adapter.js';
import { XAdapter } from '../../../adapters/x/x.adapter.js';
import { config } from '../../../config/env.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import { SUPPORTED_PROVIDERS } from '../../../constants/providers.js';
import { binderService } from '../../../services/binder.service.js';
import { logger } from '../../../utils/logger.js';

// Initialize adapters
const adapters = {
  linkedin: new LinkedInAdapter(config),
  meta: new MetaAdapter(config),
  reddit: new RedditAdapter(config),
  x: new XAdapter(config),
};

// Request validation schema
const commentRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  provider: z.enum(SUPPORTED_PROVIDERS),
  threadIdOrPostId: z.string().min(1),
});

export const createSocialComment = async (req, res, next) => {
  try {
    // ------------------------------------------------------------------------
    // VALIDATE REQUEST BODY
    // ------------------------------------------------------------------------
    const requestData = commentRequestSchema.parse(req.body);

    logger.info('Comment request received', {
      provider: requestData.provider,
      requestId: req.id,
      threadId: requestData.threadIdOrPostId,
    });

    // ------------------------------------------------------------------------
    // GET ADAPTER AND CREATE COMMENT
    // ------------------------------------------------------------------------
    const adapter = adapters[requestData.provider];
    if (!adapter) {
      const error = new ApiError(
        ERROR_CODES.UNSUPPORTED_PROVIDER,
        `Provider '${requestData.provider}' is not supported`
      );
      return res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
        requestId: req.id,
      });
    }

    const result = await adapter.createComment(requestData);

    // ------------------------------------------------------------------------
    // LOG TO BINDER IF SUCCESSFUL
    // ------------------------------------------------------------------------
    if (result.status === 'success') {
      try {
        await binderService.upsertConversation({
          externalCommentId: result.externalCommentId,
          externalThreadId: requestData.threadIdOrPostId,
          message: requestData.message,
          provider: requestData.provider,
          type: 'comment',
        });
      } catch (binderError) {
        logger.warn('Failed to log comment to Binder', {
          binderError: binderError.message,
          commentId: result.externalCommentId,
          provider: requestData.provider,
          requestId: req.id,
        });
      }
    }

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
      const apiError = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Request validation failed',
        400,
        error.errors
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        errors: apiError.details,
        message: apiError.message,
        requestId: req.id,
      });
    }

    next(error);
  }
};
