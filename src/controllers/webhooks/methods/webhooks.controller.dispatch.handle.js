// ----------------------------------------------------------------------------
// POST /webhooks/writers-room/tonka-dispatch-draft
// Tonka Dispatch draft webhook handler
// Receives AI-generated draft from n8n workflow and updates dispatch entry
// ----------------------------------------------------------------------------

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import DispatchEntries from '../../../models/dispatchEntries.model.js';
import { logger } from '../../../utils/logger.js';

export const handleTonkaDispatchDraft = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // LOG INCOMING PAYLOAD
    // ------------------------------------------------------------------------
    logger.info('Tonka Dispatch draft webhook received', {
      body: req.body,
      requestId: req.requestId,
    });

    const payload = req.body;

    // ------------------------------------------------------------------------
    // VALIDATE REQUIRED FIELDS
    // ------------------------------------------------------------------------
    if (!payload._id) {
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Missing required field: _id',
        400
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    if (!payload.draft_markdown) {
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Missing required field: draft_markdown',
        400
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    // ------------------------------------------------------------------------
    // UPDATE DISPATCH ENTRY WITH DRAFT
    // ------------------------------------------------------------------------
    const updateData = {
      draft_markdown: payload.draft_markdown,
      source: payload.source || 'writer_room',
      status: payload.status || 'draft',
      updated_at: new Date(),
    };

    // Include optional fields if provided
    if (payload.category) updateData.category = payload.category;
    if (payload.keyframe_prompt)
      updateData.keyframe_prompt = payload.keyframe_prompt;
    if (payload.social_caption)
      updateData.social_caption = payload.social_caption;
    if (payload.summary) updateData.summary = payload.summary;
    if (payload.tags) updateData.tags = payload.tags;
    if (payload.thesis) updateData.thesis = payload.thesis;
    if (payload.title) updateData.title = payload.title;

    const updatedEntry = await DispatchEntries.findByIdAndUpdate(
      payload._id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedEntry) {
      const error = new ApiError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        `Dispatch entry not found: ${payload._id}`,
        404
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    logger.info('Dispatch entry updated with draft', {
      entryId: updatedEntry._id,
      requestId: req.requestId,
      source: payload.source,
      status: updatedEntry.status,
    });

    // ------------------------------------------------------------------------
    // RETURN SUCCESS RESPONSE WITH FULL ENTRY
    // ------------------------------------------------------------------------
    return res.status(200).json({
      entry: updatedEntry.toObject(),
      message: 'Dispatch entry updated with draft successfully',
      success: true,
    });
  } catch (error) {
    logger.error('Tonka Dispatch draft webhook processing failed', {
      entryId: req.body?._id,
      error: error.message,
      requestId: req.requestId,
      stack: error.stack,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Internal server error processing Tonka Dispatch draft webhook',
      500
    );
    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      success: false,
    });
  }
};
