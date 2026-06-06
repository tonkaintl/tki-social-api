// ----------------------------------------------------------------------------
// POST /api/tonka-spark-posts/:id/visual-prompts/:promptId/images/upload
// Multipart upload: stream image → R2, then append to visual prompt images[].
//
// Multer (uploadImage middleware) parses the multipart body; the file lands
// on req.file as a Buffer. Image-only, 5MB cap enforced upstream.
// ----------------------------------------------------------------------------

import path from 'path';

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import TonkaSparkPosts from '../../../models/tonkaSparkPost.model.js';
import { buildPublicUrl, uploadObject } from '../../../services/r2.service.js';
import { logger } from '../../../utils/logger.js';

const paramsSchema = z.object({
  id: z.string().min(1, 'Entry ID is required'),
  promptId: z.string().min(1, 'Prompt ID is required'),
});

const bodySchema = z.object({
  alt: z.string().optional(),
  description: z.string().optional(),
});

// Derive a safe file extension from the upload's original name, falling back
// to the mimetype (e.g. image/png → .png). Only the extension is kept — the
// original filename is discarded so the stored object name never leaks what
// prompted the image.
function fileExtension(file) {
  const fromName = path.extname(file.originalname || '').toLowerCase();
  if (/^\.[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  const subtype = (file.mimetype || '').split('/')[1];
  return subtype ? `.${subtype.toLowerCase()}` : '.png';
}

export const uploadVisualPromptImage = async (req, res) => {
  try {
    const { id, promptId } = paramsSchema.parse(req.params);
    const { alt, description } = bodySchema.parse(req.body || {});

    if (!req.file) {
      const apiError = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'file field is required (multipart/form-data)',
        400
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        error: apiError.message,
      });
    }

    const query = id.includes('-') ? { content_id: id } : { _id: id };

    // Confirm post + prompt exist before pushing bytes.
    const entry = await TonkaSparkPosts.findOne(query, {
      _id: 1,
      content_id: 1,
      visual_prompts: 1,
    });
    if (!entry) {
      const apiError = new ApiError(
        ERROR_CODES.NOT_FOUND,
        `Tonka Spark Post not found: ${id}`,
        404
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        error: apiError.message,
      });
    }
    const promptExists = entry.visual_prompts?.some(p => p.id === promptId);
    if (!promptExists) {
      const apiError = new ApiError(
        ERROR_CODES.NOT_FOUND,
        `Visual prompt not found: ${promptId}`,
        404
      );
      return res.status(apiError.statusCode).json({
        code: apiError.code,
        error: apiError.message,
      });
    }

    // Neutral, flat object key — `sparks/<spark>/<_id>-<epochMillis>.<ext>`.
    // No "visual-prompts/<promptId>" nesting and no hint of the prompt: the
    // public URL should read like an ordinary media asset, not an AI pipeline
    // path. The image↔prompt link lives in Mongo, not in the key.
    const objectName = `${entry._id}-${Date.now()}${fileExtension(req.file)}`;
    const r2Key = `sparks/${entry.content_id || entry._id}/${objectName}`;

    logger.info('Uploading visual prompt image to R2', {
      contentType: req.file.mimetype,
      entryId: id,
      promptId,
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

    const publicUrl = buildPublicUrl(r2Key);

    const imageObject = {
      alt: alt || undefined,
      created_at: new Date(),
      description: description || undefined,
      filename: objectName,
      r2_key: r2Key,
      size: req.file.size,
      url: publicUrl,
    };

    const updatedEntry = await TonkaSparkPosts.findOneAndUpdate(
      { ...query, 'visual_prompts.id': promptId },
      {
        $push: { 'visual_prompts.$.images': imageObject },
        $set: { updated_at: new Date() },
      },
      { new: true, projection: { _id: 1, content_id: 1, visual_prompts: 1 } }
    );

    const updatedPrompt = updatedEntry.visual_prompts.find(
      p => p.id === promptId
    );

    logger.info('Visual prompt image uploaded', {
      contentId: updatedEntry.content_id,
      imageCount: updatedPrompt?.images?.length,
      promptId,
      r2Key,
      requestId: req.id,
    });

    return res.status(201).json({
      filename: objectName,
      imageUrl: publicUrl,
      size: req.file.size,
      url: publicUrl,
      visual_prompt: updatedPrompt,
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

    logger.error('Error uploading visual prompt image', {
      entryId: req.params.id,
      error: error.message,
      promptId: req.params.promptId,
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
      message: 'Failed to upload visual prompt image',
    });
  }
};
