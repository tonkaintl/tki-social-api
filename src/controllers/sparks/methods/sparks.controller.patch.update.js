import mongoose from 'mongoose';

import { FEED_CATEGORY_VALUES } from '../../../constants/tonkaDispatch.js';
import {
  SPARK_ERROR_CODE,
  SPARK_FIELDS,
  SPARK_GROUP_VALUES,
  SPARK_UPDATE_FIELDS_VALUES,
} from '../../../constants/sparks.js';
import Sparks from '../../../models/sparks.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Update a spark by ID (partial update)
 */
export async function updateSpark(req, res) {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn('Invalid tonka spark post ID format', {
        requestId: req.id,
        sparkId: id,
      });

      return res.status(400).json({
        code: SPARK_ERROR_CODE.INVALID_SPARK_ID,
        message: 'Invalid tonka spark post ID format',
        requestId: req.id,
      });
    }

    // Extract only allowed update fields
    const updateFields = {};
    Object.keys(req.body).forEach(key => {
      if (SPARK_UPDATE_FIELDS_VALUES.includes(key)) {
        updateFields[key] = req.body[key];
      }
    });

    if (Object.keys(updateFields).length === 0) {
      logger.warn('No valid update fields provided', {
        requestId: req.id,
        sparkId: id,
      });

      return res.status(400).json({
        code: SPARK_ERROR_CODE.NO_UPDATE_FIELDS,
        message: 'No valid fields to update',
        requestId: req.id,
      });
    }

    // Validate categories if provided
    if (updateFields[SPARK_FIELDS.CATEGORIES]) {
      const invalidCategories = updateFields[
        SPARK_FIELDS.CATEGORIES
      ].filter(cat => !FEED_CATEGORY_VALUES.includes(cat));

      if (invalidCategories.length > 0) {
        logger.warn('Invalid category values', {
          invalidCategories,
          requestId: req.id,
          sparkId: id,
        });

        return res.status(400).json({
          code: SPARK_ERROR_CODE.INVALID_CATEGORY,
          message: `Invalid categories: ${invalidCategories.join(', ')}. Must be one of: ${FEED_CATEGORY_VALUES.join(', ')}`,
          requestId: req.id,
        });
      }
    }

    // Validate group if provided
    if (updateFields[SPARK_FIELDS.GROUP]) {
      if (
        !SPARK_GROUP_VALUES.includes(
          updateFields[SPARK_FIELDS.GROUP]
        )
      ) {
        logger.warn('Invalid group value', {
          group: updateFields[SPARK_FIELDS.GROUP],
          requestId: req.id,
          sparkId: id,
        });

        return res.status(400).json({
          code: SPARK_ERROR_CODE.INVALID_GROUP,
          message: `Group must be one of: ${SPARK_GROUP_VALUES.join(', ')}`,
          requestId: req.id,
        });
      }
    }

    // Add updated_at timestamp
    updateFields[SPARK_FIELDS.UPDATED_AT] = new Date();

    logger.info('Updating tonka spark post', {
      requestId: req.id,
      sparkId: id,
      updateFields: Object.keys(updateFields),
    });

    // Perform update
    const updated = await Sparks.findByIdAndUpdate(
      id,
      { $set: updateFields },
      {
        new: true, // Return updated document
        runValidators: true,
      }
    );

    if (!updated) {
      logger.warn('Tonka tonka spark post post not found', {
        requestId: req.id,
        sparkId: id,
      });

      return res.status(404).json({
        code: SPARK_ERROR_CODE.SPARK_NOT_FOUND,
        message: 'Tonka tonka spark post post not found',
        requestId: req.id,
      });
    }

    logger.info('Tonka tonka spark post post updated successfully', {
      requestId: req.id,
      sparkId: id,
    });

    return res.status(200).json({
      requestId: req.id,
      spark: updated,
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      logger.warn('Tonka tonka spark post post validation failed', {
        error: error.message,
        requestId: req.id,
        sparkId: req.params.id,
      });

      return res.status(400).json({
        code: SPARK_ERROR_CODE.VALIDATION_ERROR,
        message: error.message,
        requestId: req.id,
      });
    }

    // Handle duplicate section errors
    if (error.code === 11000) {
      logger.warn('Duplicate section', {
        error: error.message,
        requestId: req.id,
        sparkId: req.params.id,
      });

      return res.status(400).json({
        code: SPARK_ERROR_CODE.DUPLICATE_SECTION,
        message: 'A tonka spark post with this section already exists',
        requestId: req.id,
      });
    }

    logger.error('Failed to update tonka spark post', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
      sparkId: req.params.id,
    });

    return res.status(500).json({
      code: SPARK_ERROR_CODE.SPARK_UPDATE_FAILED,
      message: 'Failed to update tonka spark post',
      requestId: req.id,
    });
  }
}
