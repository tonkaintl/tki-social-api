import { PIPELINE_ERROR_CODE } from '../../../constants/writersroom.js';
import { peekNextIdea } from '../../../services/writersRoom/ideaRotation.js';
import { logger } from '../../../utils/logger.js';

/**
 * Peek at the next idea in the SEASON-01-IDEAS.md rotation WITHOUT
 * advancing the cursor. Useful for confirming the rotation is configured
 * before kicking off a cron-driven run.
 *
 * Response: { ok, cursor, idea, totalIdeas, lastUsedAt, requestId }
 */
export async function getNextWritersRoomIdea(req, res) {
  try {
    const info = await peekNextIdea();
    return res.status(200).json({
      cursor: info.cursor,
      idea: info.idea,
      lastUsedAt: info.last_used_at,
      ok: true,
      requestId: req.id,
      totalIdeas: info.total_ideas,
    });
  } catch (err) {
    logger.error('[WritersRoom] Idea peek failed', {
      error: err.message,
      requestId: req.id,
    });
    return res.status(500).json({
      code: err.code || PIPELINE_ERROR_CODE.IDEA_ROTATION_READ_FAILED,
      message: err.message,
      requestId: req.id,
    });
  }
}
