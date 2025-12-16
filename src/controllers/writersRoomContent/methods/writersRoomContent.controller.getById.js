// ----------------------------------------------------------------------------
// GET /api/writers-room/content/:id
// Get a single Writers Room content by content_id
// ----------------------------------------------------------------------------

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import WritersRoomEntries from '../../../models/writersRoomEntries.model.js';
import { logger } from '../../../utils/logger.js';

export const getWritersRoomContentById = async (req, res) => {
  try {
    const { id } = req.params;

    // ------------------------------------------------------------------------
    // FIND CONTENT BY content_id
    // ------------------------------------------------------------------------
    const content = await WritersRoomEntries.findOne({
      content_id: id,
    }).lean();

    if (!content) {
      const error = new ApiError(
        ERROR_CODES.NOT_FOUND,
        `Writers Room content not found: ${id}`,
        404
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.message,
      });
    }

    logger.info('Writers Room content retrieved', {
      content_id: id,
    });

    // ------------------------------------------------------------------------
    // RETURN CONTENT
    // ------------------------------------------------------------------------
    return res.status(200).json(content);
  } catch (error) {
    logger.error('Error retrieving Writers Room content', {
      content_id: req.params.id,
      error: error.message,
      stack: error.stack,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_ERROR,
      'Failed to retrieve Writers Room content',
      500
    );

    return res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
    });
  }
};
