/**
 * Writers Room Entries Visual Prompt Image Upload Controller
 * Add generated images to visual prompts
 */

import { z } from 'zod';

import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import WritersRoomEntries from '../../../models/writersRoomEntries.model.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const visualPromptParamsSchema = z.object({
  id: z.string().min(1, 'Entry ID is required'),
  promptId: z.string().min(1, 'Prompt ID is required'),
});

const addImageBodySchema = z.object({
  alt: z.string().optional(),
  description: z.string().optional(),
  filename: z.string().optional(),
  imageUrl: z.string().url('Valid URL is required'),
  size: z.number().optional(),
});

// ----------------------------------------------------------------------------
// Controller
// ----------------------------------------------------------------------------

/**
 * Add Generated Image to Visual Prompt
 * POST /api/writers-room-entries/:id/visual-prompts/:promptId/images
 */
export const addVisualPromptImage = async (req, res) => {
  try {
    const { id, promptId } = visualPromptParamsSchema.parse(req.params);
    const imageData = addImageBodySchema.parse(req.body);

    logger.info('Adding image to visual prompt', {
      entryId: id,
      promptId,
      requestId: req.id,
    });

    // Determine query type (content_id vs _id)
    const query = id.includes('-') ? { content_id: id } : { _id: id };

    // Check if entry and prompt exist
    const entry = await WritersRoomEntries.findOne(query);

    if (!entry) {
      const error = new ApiError(
        ERROR_CODES.NOT_FOUND,
        `Writers Room entry not found: ${id}`,
        404
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    const promptExists = entry.visual_prompts?.some(
      prompt => prompt.id === promptId
    );

    if (!promptExists) {
      const error = new ApiError(
        ERROR_CODES.NOT_FOUND,
        `Visual prompt not found: ${promptId}`,
        404
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    // Create image object with metadata
    const imageObject = {
      alt: imageData.alt,
      created_at: new Date(),
      description: imageData.description,
      filename: imageData.filename,
      size: imageData.size,
      url: imageData.imageUrl,
    };

    // Update the specific visual prompt with the new image
    const updatedEntry = await WritersRoomEntries.findOneAndUpdate(
      {
        ...query,
        'visual_prompts.id': promptId,
      },
      {
        $addToSet: { 'visual_prompts.$.images': imageObject },
        $set: { updated_at: new Date() },
      },
      { new: true, projection: { _id: 1, content_id: 1, visual_prompts: 1 } }
    );

    if (!updatedEntry) {
      const error = new ApiError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Failed to update visual prompt'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    // Find the updated prompt
    const updatedPrompt = updatedEntry.visual_prompts.find(
      prompt => prompt.id === promptId
    );

    const response = {
      added_image: imageObject,
      content_id: updatedEntry.content_id,
      image_count: updatedPrompt?.images?.length || 0,
      message: 'Image added to visual prompt successfully',
      prompt_id: promptId,
    };

    logger.info('Image added to visual prompt successfully', {
      contentId: updatedEntry.content_id,
      imageCount: updatedPrompt?.images?.length,
      imageUrl: imageData.imageUrl,
      promptId,
      requestId: req.id,
    });

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error adding image to visual prompt', {
      entryId: req.params.id,
      error: error.message,
      promptId: req.params.promptId,
      requestId: req.id,
      stack: error.stack,
    });

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

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
    res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      message: 'Failed to add image to visual prompt',
    });
  }
};
