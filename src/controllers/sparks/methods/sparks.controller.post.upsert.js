import { FEED_CATEGORY_VALUES } from '../../../constants/tonkaDispatch.js';
import {
  SPARK_ERROR_CODE,
  SPARK_FIELDS,
  SPARK_GROUP_VALUES,
} from '../../../constants/sparks.js';
import Sparks from '../../../models/sparks.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Upsert a spark by section (create or update)
 */
export async function upsertSpark(req, res) {
  try {
    const {
      categories,
      concept,
      group,
      last_used,
      release_order,
      section,
      thesis,
      times_used,
    } = req.body;

    // Validate required fields
    if (
      !section ||
      section.trim() === '' ||
      !concept ||
      concept.trim() === '' ||
      !thesis ||
      thesis.trim() === ''
    ) {
      logger.warn('Missing required fields in upsert request', {
        requestId: req.id,
      });

      return res.status(400).json({
        code: SPARK_ERROR_CODE.MISSING_REQUIRED_FIELDS,
        message: 'section, concept, and thesis are required',
        requestId: req.id,
      });
    }

    // Validate categories if provided
    if (categories && categories.length > 0) {
      const invalidCategories = categories.filter(
        cat => !FEED_CATEGORY_VALUES.includes(cat)
      );

      if (invalidCategories.length > 0) {
        logger.warn('Invalid category values', {
          invalidCategories,
          requestId: req.id,
        });

        return res.status(400).json({
          code: SPARK_ERROR_CODE.INVALID_CATEGORY,
          message: `Invalid categories: ${invalidCategories.join(', ')}. Must be one of: ${FEED_CATEGORY_VALUES.join(', ')}`,
          requestId: req.id,
        });
      }
    }

    // Validate group if provided
    if (group && !SPARK_GROUP_VALUES.includes(group)) {
      logger.warn('Invalid group value', {
        group,
        requestId: req.id,
      });

      return res.status(400).json({
        code: SPARK_ERROR_CODE.INVALID_GROUP,
        message: `Group must be one of: ${SPARK_GROUP_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }

    // Normalize section
    const normalizedSection = section.trim();

    // Build update object (only include fields that were provided)
    const updateFields = {
      concept: concept.trim(),
      section: normalizedSection,
      thesis: thesis.trim(),
      updated_at: new Date(),
    };

    if (categories !== undefined) updateFields.categories = categories;
    if (group !== undefined) updateFields.group = group;
    if (release_order !== undefined) updateFields.release_order = release_order;
    if (last_used !== undefined) updateFields.last_used = last_used;
    if (times_used !== undefined) updateFields.times_used = times_used;

    logger.info('Upserting tonka spark post', {
      requestId: req.id,
      section: normalizedSection,
    });

    // Perform upsert operation
    const result = await Sparks.findOneAndUpdate(
      { [SPARK_FIELDS.SECTION]: normalizedSection },
      { $set: updateFields },
      {
        new: true, // Return updated document
        runValidators: true,
        upsert: true, // Create if doesn't exist
      }
    );

    // Check if this was a create or update
    const wasCreated =
      result[SPARK_FIELDS.CREATED_AT].getTime() ===
      result[SPARK_FIELDS.UPDATED_AT].getTime();

    logger.info('Tonka tonka spark post post upserted successfully', {
      created: wasCreated,
      requestId: req.id,
      section: normalizedSection,
      sparkId: result._id,
    });

    return res.status(200).json({
      created: wasCreated,
      requestId: req.id,
      tonkaSpark: result,
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      logger.warn('Tonka tonka spark post post validation failed', {
        error: error.message,
        requestId: req.id,
      });

      return res.status(400).json({
        code: SPARK_ERROR_CODE.VALIDATION_ERROR,
        message: error.message,
        requestId: req.id,
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      logger.warn('Duplicate section', {
        error: error.message,
        requestId: req.id,
      });

      return res.status(400).json({
        code: SPARK_ERROR_CODE.DUPLICATE_SECTION,
        message: 'A tonka spark post with this section already exists',
        requestId: req.id,
      });
    }

    logger.error('Failed to upsert tonka spark post', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: SPARK_ERROR_CODE.SPARK_UPSERT_FAILED,
      message: 'Failed to upsert tonka spark post',
      requestId: req.id,
    });
  }
}
