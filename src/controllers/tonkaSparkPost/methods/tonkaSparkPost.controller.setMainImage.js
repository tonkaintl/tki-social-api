// ----------------------------------------------------------------------------
// PATCH /api/tonka-spark-posts/:id/main-image
// Set the post's main/hero image. Accepts EITHER:
//   - a multipart file upload (field "file") → streamed to R2, we own it; or
//   - a JSON/form body { url } (e.g. a copied visual-prompt image URL).
// The uploadImage middleware parses multipart bodies; for JSON requests it
// passes through and req.file is undefined. :id may be a content_id or _id.
// ----------------------------------------------------------------------------

import path from 'path';

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import TonkaSparkPosts from '../../../models/tonkaSparkPost.model.js';
import {
  buildPublicUrl,
  keyFromPublicUrl,
  uploadObject,
} from '../../../services/r2.service.js';
import { deleteOwnedMainImageObject } from '../../../services/tonkaSparkPost.service.js';
import { logger } from '../../../utils/logger.js';

const paramsSchema = z.object({
  id: z.string().min(1, 'Post ID is required'),
});

// alt/description are optional metadata. url/imageUrl are accepted (either key)
// for the paste-a-URL mode; ignored when a file is uploaded.
const bodySchema = z.object({
  alt: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  url: z.string().optional(),
});

// Safe extension from the upload's original name, falling back to the
// mimetype. Only the extension is kept so the object name leaks nothing.
function fileExtension(file) {
  const fromName = path.extname(file.originalname || '').toLowerCase();
  if (/^\.[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  const subtype = (file.mimetype || '').split('/')[1];
  return subtype ? `.${subtype.toLowerCase()}` : '.png';
}

export const setMainImage = async (req, res) => {
  try {
    const { id } = paramsSchema.parse(req.params);
    const { alt, description, imageUrl, url } = bodySchema.parse(
      req.body || {}
    );

    const query = id.includes('-') ? { content_id: id } : { _id: id };

    const post = await TonkaSparkPosts.findOne(query, {
      _id: 1,
      content_id: 1,
      post_main_image: 1,
    });

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

    let imageObject;

    if (req.file) {
      // Upload mode: stream the file to a dedicated, owned R2 object. The
      // "main-" prefix keeps it distinct from visual-prompt image keys.
      const objectName = `main-${post._id}-${Date.now()}${fileExtension(req.file)}`;
      const r2Key = `sparks/${post.content_id || post._id}/${objectName}`;

      logger.info('Uploading post main image to R2', {
        contentType: req.file.mimetype,
        entryId: id,
        r2Key,
        requestId: req.id,
        size: req.file.size,
      });

      await uploadObject({
        body: req.file.buffer,
        cacheControl: 'public, max-age=31536000, immutable',
        contentType: req.file.mimetype,
        key: r2Key,
      });

      imageObject = {
        alt: alt || undefined,
        created_at: new Date(),
        description: description || undefined,
        filename: objectName,
        r2_key: r2Key,
        size: req.file.size,
        source: 'upload',
        url: buildPublicUrl(r2Key),
      };
    } else {
      // URL mode: a pasted URL (typically a copied visual-prompt image). We
      // record but do not own it. r2_key is derived only when it's under our
      // R2 base — informational; URL-sourced images are never deleted.
      const finalUrl = (url || imageUrl || '').trim();

      if (!finalUrl) {
        const error = new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          'Provide either a file upload (field "file") or a url',
          400
        );
        return res.status(error.statusCode).json({
          code: error.code,
          error: error.message,
        });
      }

      imageObject = {
        alt: alt || undefined,
        created_at: new Date(),
        description: description || undefined,
        r2_key: keyFromPublicUrl(finalUrl) || undefined,
        source: 'url',
        url: finalUrl,
      };
    }

    // Replacing an existing owned upload? Clean up the old R2 object (unless
    // the new image somehow reuses the same key).
    await deleteOwnedMainImageObject(post.post_main_image, imageObject.r2_key);

    const updated = await TonkaSparkPosts.findOneAndUpdate(
      query,
      { $set: { post_main_image: imageObject, updated_at: new Date() } },
      {
        new: true,
        projection: { _id: 1, content_id: 1, post_main_image: 1 },
        runValidators: true,
      }
    );

    logger.info('Post main image set', {
      contentId: updated.content_id,
      requestId: req.id,
      source: imageObject.source,
    });

    return res.status(200).json({
      content_id: updated.content_id,
      post_main_image: updated.post_main_image,
      requestId: req.id,
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

    logger.error('Error setting post main image', {
      entryId: req.params.id,
      error: error.message,
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
      message: 'Failed to set post main image',
    });
  }
};
