import {
  PIPELINE_ERROR_CODE,
  RUN_PAGINATION,
  RUN_STATUS_VALUES,
  RUN_TRIGGER_VALUES,
} from '../../../constants/writersroom.js';
import { listRuns } from '../../../services/writersRoom/persistence.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * GET /api/writers-room/runs
 *
 * List pipeline runs with filters. Heavy fields (final_payload, big
 * snapshot blobs) are dropped from the list view — fetch GET /:id for
 * the full record. Use this to mine for gems in failed runs or to audit
 * what the cron produced.
 *
 * Query params:
 *   status       — RUN_STATUS value: running | succeeded | partial | failed
 *   brand        — exact target_brand match (e.g. tonka_blog)
 *   mode         — exact project_mode match (e.g. blog_post)
 *   triggered_by — RUN_TRIGGER value: api | cron | test-node
 *   story_seed   — case-insensitive substring match against story_seed
 *   since        — ISO date; runs created on/after
 *   until        — ISO date; runs created on/before
 *   page         — 1-indexed, default 1
 *   limit        — default 25, max 100, 0 = all (capped at MAX_LIMIT)
 */
export async function listWritersRoomRuns(req, res) {
  try {
    const {
      brand,
      limit,
      mode,
      page,
      since,
      status,
      story_seed: storySeed,
      triggered_by: triggeredBy,
      until,
    } = req.query;

    if (status && !RUN_STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        code: 'INVALID_STATUS',
        message: `status must be one of: ${RUN_STATUS_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }

    if (triggeredBy && !RUN_TRIGGER_VALUES.includes(triggeredBy)) {
      return res.status(400).json({
        code: 'INVALID_TRIGGER',
        message: `triggered_by must be one of: ${RUN_TRIGGER_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }

    const pageNum = parseInt(page, 10) || RUN_PAGINATION.DEFAULT_PAGE;
    if (pageNum < 1) {
      return res.status(400).json({
        code: 'INVALID_PAGE',
        message: 'page must be at least 1',
        requestId: req.id,
      });
    }

    const parsedLimit = parseInt(limit, 10);
    const limitNum = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), RUN_PAGINATION.MAX_LIMIT)
      : RUN_PAGINATION.DEFAULT_LIMIT;

    const result = await listRuns({
      brand: brand || null,
      limit: limitNum,
      mode: mode || null,
      page: pageNum,
      since: since || null,
      status: status || null,
      storySeed: storySeed || null,
      triggeredBy: triggeredBy || null,
      until: until || null,
    });

    return res.status(200).json({
      count: result.count,
      filters: {
        ...(status && { status }),
        ...(brand && { brand }),
        ...(mode && { mode }),
        ...(triggeredBy && { triggered_by: triggeredBy }),
        ...(storySeed && { story_seed: storySeed }),
        ...(since && { since }),
        ...(until && { until }),
      },
      page: result.page,
      requestId: req.id,
      runs: result.items,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
    });
  } catch (err) {
    logger.error('[WritersRoom] List runs failed', {
      error: err.message,
      requestId: req.id,
      stack: err.stack,
    });
    return res.status(500).json({
      code: PIPELINE_ERROR_CODE.RUN_LIST_FAILED,
      message: 'Failed to list runs',
      requestId: req.id,
    });
  }
}
