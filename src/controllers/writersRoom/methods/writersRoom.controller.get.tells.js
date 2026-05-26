import {
  TELL_CATEGORY_VALUES,
  TELL_PAGINATION,
  TELL_SEVERITY_VALUES,
} from '../../../constants/writersroom.js';
import { listTells } from '../../../services/writersRoom/aiTells.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * GET /api/writers-room/tells
 *
 * List AI-tells dictionary entries. Used by the admin UI to populate the
 * pattern table and by the pipeline (indirectly via the cache) to decide
 * what to flag.
 *
 * Query params (all optional):
 *   category — ai_tell | brand_forbidden | weasel_words | preamble
 *   severity — low | medium | high
 *   active   — "true" | "false"
 *   page, limit
 */
export async function listWritersRoomTells(req, res) {
  try {
    const { active, category, limit, page, severity } = req.query;

    if (category && !TELL_CATEGORY_VALUES.includes(category)) {
      return res.status(400).json({
        code: 'INVALID_CATEGORY',
        message: `category must be one of: ${TELL_CATEGORY_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }
    if (severity && !TELL_SEVERITY_VALUES.includes(severity)) {
      return res.status(400).json({
        code: 'INVALID_SEVERITY',
        message: `severity must be one of: ${TELL_SEVERITY_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }

    const pageNum = parseInt(page, 10) || TELL_PAGINATION.DEFAULT_PAGE;
    const parsedLimit = parseInt(limit, 10);
    const limitNum = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), TELL_PAGINATION.MAX_LIMIT)
      : TELL_PAGINATION.DEFAULT_LIMIT;

    let activeFilter = null;
    if (active === 'true') activeFilter = true;
    else if (active === 'false') activeFilter = false;

    const result = await listTells({
      active: activeFilter,
      category: category || null,
      limit: limitNum,
      page: pageNum,
      severity: severity || null,
    });

    return res.status(200).json({
      count: result.count,
      filters: {
        ...(category && { category }),
        ...(severity && { severity }),
        ...(activeFilter !== null && { active: activeFilter }),
      },
      ok: true,
      page: result.page,
      requestId: req.id,
      tells: result.tells,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
    });
  } catch (err) {
    logger.error('[WritersRoom] List tells failed', {
      error: err.message,
      requestId: req.id,
    });
    return res.status(500).json({
      code: 'TELLS_LIST_FAILED',
      message: 'Failed to list tells',
      requestId: req.id,
    });
  }
}
