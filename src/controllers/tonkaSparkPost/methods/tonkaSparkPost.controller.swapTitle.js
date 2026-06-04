// ----------------------------------------------------------------------------
// PATCH /api/tonka-spark-posts/:id/title/swap
// Promote a title to the current title and demote the old one into the
// alternatives list.
//
// Body: { old_title, new_title }
//   - old_title: the title being demoted into title_variations
//   - new_title: the title being promoted to final_draft.title
//
// Result:
//   - final_draft.title becomes new_title.
//   - new_title is removed from title_variations (the main title shouldn't
//     linger as an alternative) — best effort, it may not be present.
//   - old_title is appended to title_variations if it isn't already there;
//     if it's already present, it's left as-is (no duplicate).
// ----------------------------------------------------------------------------

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import TonkaSparkPosts from '../../../models/tonkaSparkPost.model.js';
import { logger } from '../../../utils/logger.js';
import { sanitizeText } from '../../../utils/sanitizeControlChars.js';

const paramsSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
});

const swapBodySchema = z
  .object({
    new_title: z
      .string({
        invalid_type_error: 'new_title must be a string',
        required_error: 'new_title is required',
      })
      .trim()
      .min(1, 'new_title cannot be empty'),
    old_title: z
      .string({
        invalid_type_error: 'old_title must be a string',
        required_error: 'old_title is required',
      })
      .trim()
      .min(1, 'old_title cannot be empty'),
  })
  .refine(data => data.old_title !== data.new_title, {
    message: 'old_title and new_title must differ',
    path: ['new_title'],
  });

export const swapTonkaSparkPostTitle = async (req, res) => {
  try {
    const { id } = paramsSchema.parse(req.params);
    const parsed = swapBodySchema.parse(req.body);
    // Scrub mangled control chars on both inputs so a swap can't (re)persist
    // the corruption — and so matching works against legacy dirty values,
    // which we also clean below.
    const old_title = sanitizeText(parsed.old_title);
    const new_title = sanitizeText(parsed.new_title);

    const query = id.includes('-') ? { content_id: id } : { _id: id };

    const post = await TonkaSparkPosts.findOne(query);

    if (!post) {
      const error = new ApiError(
        ERROR_CODES.NOT_FOUND,
        `Tonka Spark Post not found: ${id}`,
        404
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    // Sanitize the stored alternatives too — this both cleans legacy dirty
    // entries and lets the (clean) new_title match a previously-corrupted one.
    // Then drop every exact match of new_title: the promoted title shouldn't
    // linger as an alternative (best effort — it may not be present).
    const variations = (post.title_variations ?? [])
      .map(title => sanitizeText(title))
      .filter(title => title !== new_title);

    // Demote old_title into the alternatives. Leave it alone if it's already
    // there; otherwise append it.
    if (!variations.includes(old_title)) variations.push(old_title);

    logger.info('Swapping tonka spark post title', {
      postId: id,
      requestId: req.id,
    });

    if (!post.final_draft) post.final_draft = {};
    post.final_draft.title = new_title;
    post.title_variations = variations;
    post.updated_at = new Date();
    post.markModified('title_variations');

    await post.save();

    logger.info('Tonka spark post title swapped', {
      contentId: post.content_id,
      requestId: req.id,
    });

    return res.status(200).json({
      content_id: post.content_id,
      final_draft: post.final_draft,
      requestId: req.id,
      title_variations: post.title_variations,
      updated_at: post.updated_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request data',
        400,
        error.errors
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        details: apiError.details,
        error: apiError.message,
      });
    }

    logger.error('Error swapping tonka spark post title', {
      error: error.message,
      postId: req.params.id,
      requestId: req.id,
      stack: error.stack,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      message: 'Failed to swap title',
    });
  }
};
