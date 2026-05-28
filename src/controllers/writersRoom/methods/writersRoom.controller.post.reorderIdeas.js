import { PIPELINE_ERROR_CODE } from '../../../constants/writersroom.js';
import { reorderIdeas } from '../../../services/writersRoom/ideas.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * POST /api/writers-room/ideas/reorder
 *
 * Bulk position update. Lets the frontend drag-reorder the list with a
 * single round trip.
 *
 * Body:
 *   {
 *     items: [{ id: ObjectId, position: number }, ...]
 *   }
 *
 * Tip for clients: use multiples of 10 (or wider) so inserting between two
 * rows doesn't cascade renumbers.
 */
export async function reorderWritersRoomIdeas(req, res) {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!items || items.length === 0) {
      return res.status(400).json({
        code: 'MISSING_ITEMS',
        message: 'items array is required',
        requestId: req.id,
      });
    }

    const result = await reorderIdeas(items);
    return res.status(200).json({
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      ok: true,
      requestId: req.id,
    });
  } catch (err) {
    logger.error('[WritersRoom] Reorder ideas failed', {
      error: err.message,
      requestId: req.id,
    });
    return res.status(500).json({
      code: PIPELINE_ERROR_CODE.IDEAS_CRUD_FAILED,
      message: 'Failed to reorder ideas',
      requestId: req.id,
    });
  }
}
