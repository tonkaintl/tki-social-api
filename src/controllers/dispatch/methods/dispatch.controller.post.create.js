// ----------------------------------------------------------------------------
// POST /api/dispatch-entries
// Create a Tonka Dispatch entry (starts as "idea" stage)
// ----------------------------------------------------------------------------

import { z } from 'zod';

import {
  DISPATCH_CATEGORY_VALUES,
  DISPATCH_STATUS,
} from '../../../constants/dispatch.js';
import {
  ApiError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../../constants/errors.js';
import DispatchEntries from '../../../models/dispatchEntries.model.js';
import { logger } from '../../../utils/logger.js';

// Request validation schema
const createDispatchEntrySchema = z.object({
  category: z
    .enum(DISPATCH_CATEGORY_VALUES, {
      errorMap: () => ({ message: 'Invalid category' }),
    })
    .describe('Content category'),
  created_by: z
    .string()
    .min(1, 'Created by is required')
    .describe('Author identifier'),
  tags: z
    .array(z.string())
    .optional()
    .default([])
    .describe('Optional tags for organization'),
  thesis: z
    .string()
    .min(10, 'Thesis must be at least 10 characters')
    .optional()
    .describe('Core argument or point'),
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .describe('Entry title'),
});

/**
 * Create Tonka Dispatch entry
 * POST /api/dispatch-entries
 */
export const createDispatchEntry = async (req, res, next) => {
  try {
    // Validate request body
    const validationResult = createDispatchEntrySchema.safeParse(req.body);

    if (!validationResult.success) {
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        ERROR_MESSAGES.INVALID_REQUEST_DATA,
        400,
        validationResult.error.errors
      );
      return res.status(error.statusCode).json({
        code: error.code,
        details: error.details,
        message: error.message,
      });
    }

    const { category, created_by, tags, thesis, title } = validationResult.data;

    logger.info('Creating Tonka Dispatch entry', {
      category,
      created_by,
      requestId: req.requestId,
      title,
    });

    // Create new dispatch entry (starts at "idea" stage)
    const newEntry = new DispatchEntries({
      category,
      created_by,
      status: DISPATCH_STATUS.IDEA,
      tags,
      thesis,
      title,
    });

    await newEntry.save();

    logger.info('Dispatch entry created successfully', {
      category,
      entryId: newEntry._id,
      requestId: req.requestId,
      status: DISPATCH_STATUS.IDEA,
      title,
    });

    // Trigger n8n webhook for post-creation processing
    const webhookUrl = process.env.N8N_TONKA_DISPATCH_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const webhookPayload = {
          _id: newEntry._id,
          category: newEntry.category,
          created_at: newEntry.created_at,
          created_by: newEntry.created_by,
          status: newEntry.status,
          tags: newEntry.tags,
          thesis: newEntry.thesis,
          title: newEntry.title,
          version: newEntry.version,
        };

        logger.info('Sending webhook to n8n', {
          entryId: newEntry._id,
          requestId: req.requestId,
          webhookUrl,
        });

        const response = await fetch(webhookUrl, {
          body: JSON.stringify(webhookPayload),
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.N8N_INTERNAL_SECRET || '',
          },
          method: 'POST',
        });

        const responseText = await response.text();

        if (response.ok) {
          logger.info('n8n webhook triggered successfully', {
            entryId: newEntry._id,
            requestId: req.requestId,
            responseStatus: response.status,
          });
        } else {
          logger.warn('n8n webhook call failed', {
            entryId: newEntry._id,
            requestId: req.requestId,
            responseBody: responseText,
            status: response.status,
          });
        }
      } catch (webhookError) {
        logger.error('Error calling n8n webhook', {
          entryId: newEntry._id,
          error: webhookError.message,
          requestId: req.requestId,
          stack: webhookError.stack,
        });
        // Don't fail the request if webhook fails
      }
    }

    // Return success response
    res.status(201).json({
      entry: {
        _id: newEntry._id,
        category: newEntry.category,
        created_at: newEntry.created_at,
        created_by: newEntry.created_by,
        status: newEntry.status,
        tags: newEntry.tags,
        thesis: newEntry.thesis,
        title: newEntry.title,
      },
      message: 'Dispatch entry created successfully',
      success: true,
    });
  } catch (error) {
    logger.error('Error creating dispatch entry', {
      error: error.message,
      requestId: req.requestId,
      stack: error.stack,
      title: req.body.title,
    });

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        code: error.code,
        message: error.message,
      });
    }

    next(error);
  }
};
