import { PIPELINE_ERROR_CODE } from '../../../constants/writersroom.js';
import { runWritersRoomOnce } from '../../../services/writersRoom.cron.js';
import { logger } from '../../../utils/logger.js';

/**
 * POST /api/writers-room/run-next
 *
 * Fire-and-forget: behaves EXACTLY like one cron fire. Atomically claims
 * the next UNUSED idea, kicks off the pipeline in the background, and
 * returns 202 with the claimed idea. The HTTP response does NOT wait for
 * the pipeline to finish (~3 minutes).
 *
 * Multiple parallel calls each claim a different idea (atomic
 * findOneAndUpdate in the selector), so the operator can hit this 3x to
 * fire 3 parallel pipelines.
 *
 * Slider randomization + draft length + research etc. all come from the
 * same WRITERS_ROOM_* env vars the cron uses. Each successful run writes
 * to tonka_spark_posts and (when TONKA_SPARK_SEND_EMAIL=true) sends the
 * same notification email as the spark form submission path.
 *
 * No request body — everything is env-driven.
 *
 * Response 202:
 *   {
 *     ok: true,
 *     accepted: true,
 *     idea: { _id, title, category, position, season, status, ... },
 *     message: "Pipeline running in background...",
 *     requestId: "..."
 *   }
 *
 * Response 409 — when no UNUSED ideas remain in the season:
 *   {
 *     code: "IDEAS_SEASON_EXHAUSTED",
 *     message: "...",
 *     requestId
 *   }
 *
 * Errors during the background pipeline are logged but never surface to
 * this response — by definition fire-and-forget. To check what happened,
 * tail the logs, or query GET /api/writers-room/runs after a few minutes.
 */
export async function runWritersRoomNext(req, res) {
  try {
    const claimedIdea = await runWritersRoomOnce(
      req.authenticatedUser?.email
        ? `manual:${req.authenticatedUser.email}`
        : 'manual'
    );

    return res.status(202).json({
      accepted: true,
      idea: claimedIdea,
      message:
        'Pipeline running in background (~3 min). Check GET /api/writers-room/runs for progress.',
      ok: true,
      requestId: req.id,
    });
  } catch (err) {
    if (err.code === PIPELINE_ERROR_CODE.IDEAS_SEASON_EXHAUSTED) {
      return res.status(409).json({
        code: err.code,
        message: err.message,
        requestId: req.id,
      });
    }
    logger.error('[WritersRoom] run-next claim failed', {
      error: err.message,
      requestId: req.id,
      stack: err.stack,
    });
    return res.status(500).json({
      code: err.code || PIPELINE_ERROR_CODE.PIPELINE_FAILED,
      message: err.message,
      requestId: req.id,
    });
  }
}
