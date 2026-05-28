import { PIPELINE_ERROR_CODE } from '../../../constants/writersroom.js';
import { getIdea } from '../../../services/writersRoom/ideas.service.js';
import { logger } from '../../../utils/logger.js';

/** GET /api/writers-room/ideas/:id — fetch a single idea. */
export async function getWritersRoomIdeaById(req, res) {
  try {
    const idea = await getIdea(req.params.id);
    if (!idea) {
      return res.status(404).json({
        code: PIPELINE_ERROR_CODE.IDEA_NOT_FOUND,
        message: 'Idea not found',
        requestId: req.id,
      });
    }
    return res.status(200).json({ idea, ok: true, requestId: req.id });
  } catch (err) {
    logger.error('[WritersRoom] Get idea failed', {
      error: err.message,
      requestId: req.id,
    });
    return res.status(500).json({
      code: PIPELINE_ERROR_CODE.IDEAS_CRUD_FAILED,
      message: 'Failed to fetch idea',
      requestId: req.id,
    });
  }
}
