import { z } from 'zod';

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import {
  getAllMetricoolPostsFormatted,
  syncMetricoolPosts,
} from '../../../services/metricool.service.js';
import { logger } from '../../../utils/logger.js';

// Validation schema for query parameters
const querySchema = z.object({
  includePublished: z
    .string()
    .optional()
    .transform(str => str === 'true'),
  sync: z
    .string()
    .optional()
    .transform(str => str === 'true'),
});

/**
 * Get all scheduled and draft posts from Metricool
 * GET /metricool/posts
 */
export const getAllMetricoolPosts = async (req, res, next) => {
  try {
    // Validate query parameters
    const validationResult = querySchema.safeParse(req.query);
    if (!validationResult.success) {
      logger.warn('Invalid query parameters for Metricool posts retrieval', {
        errors: validationResult.error.errors,
        query: req.query,
      });

      throw new ApiError(
        'Invalid query parameters',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        validationResult.error.errors
      );
    }

    const { includePublished, sync } = validationResult.data;

    logger.info('Retrieving all Metricool posts', {
      includePublished,
    });

    // Get all posts from Metricool in standardized format
    const postsResult = await getAllMetricoolPostsFormatted();

    // Initialize sync results (will be populated if sync is requested)
    let syncResults = null;

    // Sync to campaigns if requested
    if (sync) {
      logger.info('Syncing Metricool posts to campaigns');

      syncResults = await syncMetricoolPosts({
        stockNumber: null, // Sync all campaigns
      });

      logger.info('Metricool sync completed', syncResults);
    }

    logger.info('Successfully retrieved Metricool posts', {
      count: postsResult.count,
      includePublished,
      syncEnabled: sync,
    });

    const response = {
      count: postsResult.count,
      data: postsResult.data,
      filters: {
        includePublished,
      },
      message: 'Metricool posts retrieved successfully',
      success: true,
    };

    // Add sync results if sync was performed
    if (sync && syncResults) {
      response.sync = syncResults;
      response.message += ` and ${syncResults.postsUpdated + syncResults.postsDeleted} posts synced to campaigns`;
    }

    return res.status(200).json(response);
  } catch (error) {
    logger.error('Failed to retrieve Metricool posts', {
      error: error.message,
      stack: error.stack,
    });

    // Pass to error handler
    next(error);
  }
};
