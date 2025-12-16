import {
  CONTENT_STATUS_VALUES,
  PLATFORM_BRANDS_VALUES,
  PLATFORM_MODES_VALUES,
} from '../../../constants/writersroom.js';
import WritersRoomEntries from '../../../models/writersRoomEntries.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * GET /api/writers-room-entries
 * List Writers Room entries with filtering and pagination
 */
export async function getWritersRoomEntriesList(req, res) {
  try {
    const {
      brand,
      limit = 50,
      mode,
      page = 1,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      status,
    } = req.query;

    logger.info('Get Writers Room entries list request', {
      brand,
      limit: Number(limit),
      mode,
      page: Number(page),
      requestId: req.id,
      search,
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

    if (search) {
      filter['final_draft.title'] = { $options: 'i', $regex: search };
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

    // Execute query with projection for lightweight list
    const [content, totalCount] = await Promise.all([
      WritersRoomEntries.find(filter)
        .select({
          _id: 1,
          content_id: 1,
          created_at: 1,
          'final_draft.title': 1,
          project_mode: 1,
          status: 1,
          'target_brand.project.name': 1,
          'target_brand.project.slug': 1,
          updated_at: 1,
        })
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      WritersRoomEntries.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    logger.info('Writers Room entries list retrieved successfully', {
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
        search: search || null,
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
    logger.error('Failed to get Writers Room entries list', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: 'WRITERS_ROOM_ENTRIES_FETCH_FAILED',
      message: 'Failed to retrieve Writers Room entries',
      requestId: req.id,
    });
  }
}
