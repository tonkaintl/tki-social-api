// ----------------------------------------------------------------------------
// GET /api/writers-room-entries/:id
// Get a single Writers Room entry by content_id
// ----------------------------------------------------------------------------

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import WritersRoomEntries from '../../../models/writersRoomEntries.model.js';
import { logger } from '../../../utils/logger.js';

export const getWritersRoomEntriesById = async (req, res) => {
  try {
    const { id } = req.params;

    // ------------------------------------------------------------------------
    // FIND CONTENT BY content_id OR _id
    // Accepts both UUID (content_id) and MongoDB ObjectId (_id)
    // ------------------------------------------------------------------------
    const query = id.includes('-')
      ? { content_id: id } // UUID format (contains dashes)
      : { _id: id }; // MongoDB ObjectId format

    const content = await WritersRoomEntries.findOne(query).lean();

    if (!content) {
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

    logger.info('Writers Room entry retrieved', {
      content_id: id,
    });

    // ------------------------------------------------------------------------
    // RETURN CONTENT
    // ------------------------------------------------------------------------
    return res.status(200).json(content);
  } catch (error) {
    logger.error('Error retrieving Writers Room entry', {
      content_id: req.params.id,
      error: error.message,
      stack: error.stack,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to retrieve Writers Room entry',
      500
    );

    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
    });
  }
};
