import { PIPELINE_ERROR_CODE } from '../../../constants/writersroom.js';
import { resetIdea } from '../../../services/writersRoom/ideas.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * POST /api/writers-room/ideas/:id/reset
 *
 * Flip an idea back to status=unused so the cron picks it up again.
 * Use when a previous run produced bad output and you want to retry the
 * topic.
 *
 * Preserves history:
 *   - run_count stays put (next run increments it to N+1)
 *   - last_run_id stays put (link to the prior, bad run remains until the
 *     next run overwrites it)
 * Clears:
 *   - used_at -> null
 *   - status  -> unused
 *
 * Idempotent — resetting a row already in UNUSED is a no-op write.
 * Works from any status (used / in_progress / retired). NOTE: resetting an
 * in_progress idea won't stop the cron's in-flight run; the cron will still
 * call markIdeaUsed when it finishes, flipping the row back to used. If you
 * want both "stop the run AND reset the idea", reset after the run logs.
 */
export async function resetWritersRoomIdea(req, res) {
  try {
    const idea = await resetIdea(req.params.id);
    if (!idea) {
      return res.status(404).json({
        code: PIPELINE_ERROR_CODE.IDEA_NOT_FOUND,
        message: 'Idea not found',
        requestId: req.id,
      });
    }
    logger.info('[WritersRoom] Idea reset to unused', {
      id: idea._id?.toString(),
      requestedBy: req.authenticatedUser?.email || null,
      title: idea.title,
    });
    return res.status(200).json({ idea, ok: true, requestId: req.id });
  } catch (err) {
    logger.error('[WritersRoom] Reset idea failed', {
      error: err.message,
      requestId: req.id,
    });
    return res.status(500).json({
      code: PIPELINE_ERROR_CODE.IDEAS_CRUD_FAILED,
      message: 'Failed to reset idea',
      requestId: req.id,
    });
  }
}
