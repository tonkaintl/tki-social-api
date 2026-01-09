// ----------------------------------------------------------------------------
// GET /api/tonka-spark-post/:id
// Get a single Tonka Spark Post by content_id
// ----------------------------------------------------------------------------

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import TonkaSparkPost from '../../../models/tonkaSparkPost.model.js';
import { logger } from '../../../utils/logger.js';

export const getTonkaSparkPostById = async (req, res) => {
  try {
    const { id } = req.params;

    // ------------------------------------------------------------------------
    // FIND CONTENT BY content_id OR _id
    // Accepts both UUID (content_id) and MongoDB ObjectId (_id)
    // ------------------------------------------------------------------------
    const query = id.includes('-')
      ? { content_id: id } // UUID format (contains dashes)
      : { _id: id }; // MongoDB ObjectId format

    const content = await TonkaSparkPost.findOne(query).lean();

    if (!content) {
      const error = new ApiError(
        ERROR_CODES.NOT_FOUND,
        `Tonka Spark Post not found: ${id}`,
        404
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    logger.info('Tonka Spark Post retrieved', {
      content_id: id,
    });

    // ------------------------------------------------------------------------
    // RETURN CONTENT
    // ------------------------------------------------------------------------
    return res.status(200).json(content);
  } catch (error) {
    logger.error('Error retrieving Tonka Spark Post', {
      content_id: req.params.id,
      error: error.message,
      stack: error.stack,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to retrieve Tonka Spark Post',
      500
    );

    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
    });
  }
};
