// ----------------------------------------------------------------------------
// POST /api/tonka-spark-posts/:id/visual-prompts/:promptId/images/upload
// Multipart upload: stream image → R2, then append to visual prompt images[].
//
// Multer (uploadImage middleware) parses the multipart body; the file lands
// on req.file as a Buffer. Image-only, 5MB cap enforced upstream.
// ----------------------------------------------------------------------------

import crypto from 'crypto';

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

function sanitizeFilename(name) {
  if (!name) return 'image';
  return name.replace(/[^\w.-]+/g, '_').slice(0, 120);
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

    const originalName = sanitizeFilename(req.file.originalname);
    const uniquePrefix = crypto.randomUUID();
    const r2Key = `sparks/${entry.content_id || entry._id}/visual-prompts/${promptId}/${uniquePrefix}-${originalName}`;

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
      filename: req.file.originalname,
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
      filename: req.file.originalname,
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
