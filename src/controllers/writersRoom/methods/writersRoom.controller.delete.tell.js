import { deleteTell } from '../../../services/writersRoom/aiTells.service.js';
import { logger } from '../../../utils/logger.js';

/** DELETE /api/writers-room/tells/:id */
export async function deleteWritersRoomTell(req, res) {
  try {
    const deleted = await deleteTell(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        code: 'TELL_NOT_FOUND',
        message: 'Tell not found',
        requestId: req.id,
      });
    }
    return res.status(200).json({ deleted: true, ok: true, requestId: req.id });
  } catch (err) {
    logger.error('[WritersRoom] Delete tell failed', {
      error: err.message,
      requestId: req.id,
    });
    return res.status(500).json({
      code: 'TELLS_DELETE_FAILED',
      message: 'Failed to delete tell',
      requestId: req.id,
    });
  }
}
