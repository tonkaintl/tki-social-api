import { PIPELINE_ERROR_CODE } from '../../../constants/writersroom.js';
import { getRun } from '../../../services/writersRoom/persistence.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * GET /api/writers-room/runs/:id
 *
 * Full detail of a single run including snapshots and final_payload. Use
 * this to inspect a failed run and pull gems out of partial snapshots.
 */
export async function getWritersRoomRunById(req, res) {
  try {
    const { id } = req.params;
    const run = await getRun(id);

    if (!run) {
      return res.status(404).json({
        code: PIPELINE_ERROR_CODE.RUN_NOT_FOUND,
        message: 'Run not found',
        requestId: req.id,
      });
    }

    return res.status(200).json({
      ok: true,
      requestId: req.id,
      run,
    });
  } catch (err) {
    logger.error('[WritersRoom] Get run by id failed', {
      error: err.message,
      requestId: req.id,
      runId: req.params.id,
    });
    return res.status(500).json({
      code: PIPELINE_ERROR_CODE.RUN_LIST_FAILED,
      message: 'Failed to fetch run',
      requestId: req.id,
    });
  }
}
