import { PIPELINE_ERROR_CODE } from '../../../constants/writersroom.js';
import { peekNextIdeaFromDb } from '../../../services/writersRoom/ideas.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * GET /api/writers-room/next-idea
 *
 * Peek at the next idea the cron would consume WITHOUT flipping its status.
 * Reads the writers_room_ideas collection (which the frontend manages via
 * /api/writers-room/ideas). Useful for confirming the rotation is configured
 * before kicking off a cron-driven run.
 *
 * Query params:
 *   season — defaults to "season_01"
 *
 * Response:
 *   { ok, season, idea, total_ideas, used, remaining, requestId }
 *   idea is null when the season is exhausted.
 */
export async function getNextWritersRoomIdea(req, res) {
  try {
    const season = req.query.season || undefined;
    const info = await peekNextIdeaFromDb(season);
    return res.status(200).json({
      idea: info.idea,
      ok: true,
      remaining: info.remaining,
      requestId: req.id,
      season: info.season,
      total_ideas: info.total_ideas,
      used: info.used,
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
