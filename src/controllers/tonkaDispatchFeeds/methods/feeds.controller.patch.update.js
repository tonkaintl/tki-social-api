import mongoose from 'mongoose';

import {
  FEED_ERROR_CODE,
  FEED_FIELDS,
  FEED_TIER,
  FEED_TIER_VALUES,
  FEED_UPDATE_FIELDS_VALUES,
  FEED_VALIDATION,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchRssLinks from '../../../models/tonkaDispatchRssLinks.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Update a feed by ID (partial update)
 */
export async function updateFeed(req, res) {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn('Invalid feed ID format', {
        feedId: id,
        requestId: req.id,
      });

      return res.status(400).json({
        code: FEED_ERROR_CODE.INVALID_FEED_ID,
        message: 'Invalid feed ID format',
        requestId: req.id,
      });
    }

    // Extract only allowed update fields
    const updateFields = {};
    Object.keys(req.body).forEach(key => {
      if (FEED_UPDATE_FIELDS_VALUES.includes(key)) {
        updateFields[key] = req.body[key];
      }
    });

    if (Object.keys(updateFields).length === 0) {
      logger.warn('No valid update fields provided', {
        feedId: id,
        requestId: req.id,
      });

      return res.status(400).json({
        code: FEED_ERROR_CODE.NO_UPDATE_FIELDS,
        message: 'No valid fields to update',
        requestId: req.id,
      });
    }

    // Validate dinner_score if provided
    if (
      updateFields[FEED_FIELDS.DINNER_SCORE] !== undefined &&
      (updateFields[FEED_FIELDS.DINNER_SCORE] <
        FEED_VALIDATION.DINNER_SCORE_MIN ||
        updateFields[FEED_FIELDS.DINNER_SCORE] >
          FEED_VALIDATION.DINNER_SCORE_MAX)
    ) {
      logger.warn('Invalid dinner_score value', {
        dinner_score: updateFields[FEED_FIELDS.DINNER_SCORE],
        feedId: id,
        requestId: req.id,
      });

      return res.status(400).json({
        code: FEED_ERROR_CODE.INVALID_DINNER_SCORE,
        message: `Dinner score must be between ${FEED_VALIDATION.DINNER_SCORE_MIN} and ${FEED_VALIDATION.DINNER_SCORE_MAX}`,
        requestId: req.id,
      });
    }

    // Validate tier if provided
    if (
      updateFields[FEED_FIELDS.TIER] &&
      !FEED_TIER_VALUES.includes(updateFields[FEED_FIELDS.TIER])
    ) {
      logger.warn('Invalid tier value', {
        feedId: id,
        requestId: req.id,
        tier: updateFields[FEED_FIELDS.TIER],
      });

      return res.status(400).json({
        code: FEED_ERROR_CODE.INVALID_TIER,
        message: `Tier must be one of: ${FEED_TIER_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }

    // Special validation: if updating to tier=rejected, ensure notes exist
    if (updateFields[FEED_FIELDS.TIER] === FEED_TIER.REJECTED) {
      // Check if notes are being provided in this update
      const hasNotesInUpdate =
        updateFields[FEED_FIELDS.NOTES] &&
        updateFields[FEED_FIELDS.NOTES].trim() !== '';

      if (!hasNotesInUpdate) {
        // Need to check if existing document has notes
        const existingFeed = await TonkaDispatchRssLinks.findById(id);

        if (
          !existingFeed ||
          !existingFeed[FEED_FIELDS.NOTES] ||
          existingFeed[FEED_FIELDS.NOTES].trim() === ''
        ) {
          logger.warn('Notes required for rejected tier', {
            feedId: id,
            requestId: req.id,
          });

          return res.status(400).json({
            code: FEED_ERROR_CODE.NOT_REQUIRED_FOR_REJECTED,
            message: `Notes are required when tier is "${FEED_TIER.REJECTED}"`,
            requestId: req.id,
          });
        }
      }
    }

    // Add updated_at timestamp
    updateFields[FEED_FIELDS.UPDATED_AT] = new Date();

    logger.info('Updating feed', {
      feedId: id,
      requestId: req.id,
      updateFields: Object.keys(updateFields),
    });

    // Perform update
    const updated = await TonkaDispatchRssLinks.findByIdAndUpdate(
      id,
      { $set: updateFields },
      {
        new: true, // Return updated document
        runValidators: true,
      }
    );

    if (!updated) {
      logger.warn('Feed not found', {
        feedId: id,
        requestId: req.id,
      });

      return res.status(404).json({
        code: FEED_ERROR_CODE.FEED_NOT_FOUND,
        message: 'Feed not found',
        requestId: req.id,
      });
    }

    logger.info('Feed updated successfully', {
      feedId: id,
      requestId: req.id,
      tier: updated[FEED_FIELDS.TIER],
    });

    return res.status(200).json({
      feed: updated,
      requestId: req.id,
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      logger.warn('Feed validation failed', {
        error: error.message,
        feedId: req.params.id,
        requestId: req.id,
      });

      return res.status(400).json({
        code: FEED_ERROR_CODE.VALIDATION_ERROR,
        message: error.message,
        requestId: req.id,
      });
    }

    logger.error('Failed to update feed', {
      error: error.message,
      feedId: req.params.id,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: FEED_ERROR_CODE.FEED_UPDATE_FAILED,
      message: 'Failed to update feed',
      requestId: req.id,
    });
  }
}
