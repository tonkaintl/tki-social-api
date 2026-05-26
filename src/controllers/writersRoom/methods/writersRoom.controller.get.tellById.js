import { getTell } from '../../../services/writersRoom/aiTells.service.js';
import { logger } from '../../../utils/logger.js';

/** GET /api/writers-room/tells/:id — fetch a single tell. */
export async function getWritersRoomTellById(req, res) {
  try {
    const tell = await getTell(req.params.id);
    if (!tell) {
      return res.status(404).json({
        code: 'TELL_NOT_FOUND',
        message: 'Tell not found',
        requestId: req.id,
      });
    }
    return res.status(200).json({ ok: true, requestId: req.id, tell });
  } catch (err) {
    logger.error('[WritersRoom] Get tell failed', {
      error: err.message,
      requestId: req.id,
    });
    return res.status(500).json({
      code: 'TELLS_GET_FAILED',
      message: 'Failed to fetch tell',
      requestId: req.id,
    });
  }
}
