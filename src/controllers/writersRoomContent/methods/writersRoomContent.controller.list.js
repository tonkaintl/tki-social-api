import {
  CONTENT_STATUS_VALUES,
  PLATFORM_BRANDS_VALUES,
  PLATFORM_MODES_VALUES,
} from '../../../constants/writersroom.js';
import WritersRoomEntries from '../../../models/writersRoomEntries.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * GET /api/writers-room/content
 * List Writers Room content with filtering and pagination
 */
export async function getWritersRoomContentList(req, res) {
  try {
    const {
      brand,
      limit = 50,
      mode,
      page = 1,
      sortBy = 'created_at',
      sortOrder = 'desc',
      status,
    } = req.query;

    logger.info('Get Writers Room content list request', {
      brand,
      limit: Number(limit),
      mode,
      page: Number(page),
      requestId: req.id,
      sortBy,
      sortOrder,
      status,
    });

    // Build filter query
    const filter = {};

    if (status && CONTENT_STATUS_VALUES.includes(status)) {
      filter.status = status;
    }

    if (brand && PLATFORM_BRANDS_VALUES.includes(brand)) {
      filter['project.brand'] = brand;
    }

    if (mode && PLATFORM_MODES_VALUES.includes(mode)) {
      filter.project_mode = mode;
    }

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort
    const sort = {};
    const sortField = ['created_at', 'updated_at', 'status'].includes(sortBy)
      ? sortBy
      : 'created_at';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [content, totalCount] = await Promise.all([
      WritersRoomEntries.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      WritersRoomEntries.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    logger.info('Writers Room content list retrieved successfully', {
      count: content.length,
      page: pageNum,
      requestId: req.id,
      totalCount,
      totalPages,
    });

    return res.status(200).json({
      content,
      count: content.length,
      filters: {
        brand: brand || null,
        mode: mode || null,
        status: status || null,
      },
      pagination: {
        currentPage: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
      },
      requestId: req.id,
    });
  } catch (error) {
    logger.error('Failed to get Writers Room content list', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: 'WRITERS_ROOM_CONTENT_FETCH_FAILED',
      message: 'Failed to retrieve Writers Room content',
      requestId: req.id,
    });
  }
}
