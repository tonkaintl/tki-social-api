import {
  IDEA_CATEGORY_VALUES,
  IDEA_STATUS_VALUES,
  IDEAS_PAGINATION,
  PIPELINE_ERROR_CODE,
} from '../../../constants/writersroom.js';
import { listIdeas } from '../../../services/writersRoom/ideas.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * GET /api/writers-room/ideas
 *
 * Lists the idea bank. Frontend uses this to populate the rotation table.
 *
 * Query params (all optional):
 *   season    — e.g. "season_01"
 *   status    — unused | in_progress | used | retired
 *   category  — commentary | vendor | buyer | culture | other
 *   page, limit
 */
export async function listWritersRoomIdeas(req, res) {
  try {
    const { category, limit, page, season, status } = req.query;

    if (status && !IDEA_STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        code: 'INVALID_STATUS',
        message: `status must be one of: ${IDEA_STATUS_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }
    if (category && !IDEA_CATEGORY_VALUES.includes(category)) {
      return res.status(400).json({
        code: 'INVALID_CATEGORY',
        message: `category must be one of: ${IDEA_CATEGORY_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }

    const pageNum = parseInt(page, 10) || IDEAS_PAGINATION.DEFAULT_PAGE;
    const parsedLimit = parseInt(limit, 10);
    const limitNum = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), IDEAS_PAGINATION.MAX_LIMIT)
      : IDEAS_PAGINATION.DEFAULT_LIMIT;

    const result = await listIdeas({
      category: category || null,
      limit: limitNum,
      page: pageNum,
      season: season || null,
      status: status || null,
    });

    return res.status(200).json({
      count: result.count,
      filters: {
        ...(season && { season }),
        ...(status && { status }),
        ...(category && { category }),
      },
      ideas: result.ideas,
      ok: true,
      page: result.page,
      requestId: req.id,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
    });
  } catch (err) {
    logger.error('[WritersRoom] List ideas failed', {
      error: err.message,
      requestId: req.id,
    });
    return res.status(500).json({
      code: PIPELINE_ERROR_CODE.IDEAS_LIST_FAILED,
      message: 'Failed to list ideas',
      requestId: req.id,
    });
  }
}
