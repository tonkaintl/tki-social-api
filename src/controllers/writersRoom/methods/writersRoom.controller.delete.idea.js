import { PIPELINE_ERROR_CODE } from '../../../constants/writersroom.js';
import { deleteIdea } from '../../../services/writersRoom/ideas.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * DELETE /api/writers-room/ideas/:id
 *
 * Defaults to soft-delete (status -> retired) so historical run docs that
 * point to this idea via last_run_id can still resolve cleanly. Pass
 * `?hard=true` to wipe the row.
 */
export async function deleteWritersRoomIdea(req, res) {
  try {
    const hard = req.query.hard === 'true';
    const result = await deleteIdea(req.params.id, { hard });
    if (!result) {
      return res.status(404).json({
        code: PIPELINE_ERROR_CODE.IDEA_NOT_FOUND,
        message: 'Idea not found',
        requestId: req.id,
      });
    }
    return res.status(200).json({
      deleted: true,
      hard: result.hard,
      ...(result.idea && { idea: result.idea }),
      ok: true,
      requestId: req.id,
    });
  } catch (err) {
    logger.error('[WritersRoom] Delete idea failed', {
      error: err.message,
      requestId: req.id,
    });
    return res.status(500).json({
      code: PIPELINE_ERROR_CODE.IDEAS_CRUD_FAILED,
      message: 'Failed to delete idea',
      requestId: req.id,
    });
  }
}
