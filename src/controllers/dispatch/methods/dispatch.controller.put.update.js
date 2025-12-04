/**
 * Tonka Dispatch Entry Update Controller
 * Updates dispatch entry with draft content, media, or publishing data
 */

import { z } from 'zod';

import {
  DISPATCH_STATUS_VALUES,
  GENERATION_SOURCE_VALUES,
  MEDIA_STATUS_VALUES,
} from '../../../constants/dispatch.js';
import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import DispatchEntries from '../../../models/dispatchEntries.model.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const updateDispatchEntryParamsSchema = z.object({
  id: z.string().min(1, 'Entry ID is required'),
});

// Flexible update schema - all fields optional for partial updates
const updateDispatchEntryBodySchema = z.object({
  draft_rich_text: z.string().optional(),
  draft_text: z.string().optional(),
  editorial_notes: z.string().optional(),
  generation_metadata: z.record(z.any()).optional(),
  generation_model: z.string().optional(),
  generation_prompt: z.string().optional(),
  generation_source: z.enum(GENERATION_SOURCE_VALUES).optional(),
  imagery_prompt: z.string().optional(),
  imagery_urls: z
    .array(
      z.object({
        description: z.string().optional(),
        generation_model: z.string().optional(),
        prompt: z.string().optional(),
        status: z.enum(MEDIA_STATUS_VALUES).optional(),
        url: z.string().url(),
      })
    )
    .optional(),
  internal_notes: z.string().optional(),
  published_at: z.string().datetime().optional(),
  published_url: z.string().url().optional(),
  revision_notes: z.string().optional(),
  status: z.enum(DISPATCH_STATUS_VALUES).optional(),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Update Dispatch Entry
 * PUT /api/dispatch-entries/:id
 */
export const updateDispatchEntry = async (req, res) => {
  try {
    // Validate parameters and body
    const paramsValidation = updateDispatchEntryParamsSchema.safeParse(
      req.params
    );
    const bodyValidation = updateDispatchEntryBodySchema.safeParse(req.body);

    if (!paramsValidation.success) {
      logger.warn('Invalid dispatch entry update parameters', {
        errors: paramsValidation.error.errors,
        params: req.params,
        requestId: req.requestId,
      });
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        ERROR_MESSAGES.INVALID_REQUEST_PARAMS,
        400,
        paramsValidation.error.errors
      );
      return res.status(error.statusCode).json({
        code: error.code,
        details: error.details,
        error: error.message,
      });
    }

    if (!bodyValidation.success) {
      logger.warn('Invalid dispatch entry update body', {
        body: req.body,
        errors: bodyValidation.error.errors,
        requestId: req.requestId,
      });
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        400,
        bodyValidation.error.errors
      );
      return res.status(error.statusCode).json({
        code: error.code,
        details: error.details,
        error: error.message,
      });
    }

    const { id } = paramsValidation.data;
    const updateData = bodyValidation.data;

    logger.info('Updating dispatch entry', {
      entryId: id,
      requestId: req.requestId,
      updateFields: Object.keys(updateData),
    });

    // Find existing entry
    const existingEntry = await DispatchEntries.findById(id);

    if (!existingEntry) {
      logger.warn('Dispatch entry not found for update', {
        entryId: id,
        requestId: req.requestId,
      });
      const error = new ApiError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Dispatch entry not found'
      );
      return res.status(error.statusCode).json({
        code: error.code,
        entry_id: id,
        error: error.message,
      });
    }

    // Build update object
    const updateObject = {
      ...updateData,
      updated_at: new Date(),
    };

    // Handle revision tracking if revision_notes provided
    if (updateData.revision_notes) {
      const revision = {
        revised_at: new Date(),
        revised_by: req.user?.email || 'system', // Use authenticated user if available
        revision_notes: updateData.revision_notes,
        version: existingEntry.version + 1,
      };

      updateObject.revision_history = [
        ...(existingEntry.revision_history || []),
        revision,
      ];
      updateObject.version = existingEntry.version + 1;

      // Remove revision_notes from top-level update
      delete updateObject.revision_notes;
    }

    // Update entry
    const updatedEntry = await DispatchEntries.findByIdAndUpdate(
      id,
      { $set: updateObject },
      {
        new: true,
      }
    );

    logger.info('Dispatch entry updated successfully', {
      entryId: id,
      requestId: req.requestId,
      version: updatedEntry.version,
    });

    // Trigger n8n webhook for post-update processing
    const webhookUrl = process.env.N8N_TONKA_DISPATCH_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          body: JSON.stringify(updatedEntry.toObject()),
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.N8N_INTERNAL_SECRET || '',
          },
          method: 'POST',
        });

        if (response.ok) {
          logger.info('n8n webhook triggered successfully', {
            entryId: updatedEntry._id,
            requestId: req.requestId,
          });
        } else {
          logger.warn('n8n webhook call failed', {
            entryId: updatedEntry._id,
            requestId: req.requestId,
            status: response.status,
          });
        }
      } catch (webhookError) {
        logger.error('Error calling n8n webhook', {
          entryId: updatedEntry._id,
          error: webhookError.message,
          requestId: req.requestId,
        });
        // Don't fail the request if webhook fails
      }
    }

    // Format response
    const response = {
      entry: updatedEntry,
      message: 'Dispatch entry updated successfully',
    };

    res.json(response);
  } catch (error) {
    logger.error('Error updating dispatch entry', {
      entryId: req.params.id,
      error: error.message,
      requestId: req.requestId,
      stack: error.stack,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    );
    res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      message: 'Failed to update dispatch entry',
    });
  }
};
