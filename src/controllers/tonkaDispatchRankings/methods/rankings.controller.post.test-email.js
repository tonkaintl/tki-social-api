import { runDailyRanking } from '../../../services/dispatchRanking.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * POST /internal/dispatch-rankings/test-email
 * Triggers a full dispatch ranking run (fetches, ranks, saves, emails)
 * Requires x-internal-secret authentication
 */
export async function testDispatchEmail(req, res) {
  const requestId = req.id;

  try {
    logger.info('[DispatchRankings] Test email run initiated', { requestId });

    const result = await runDailyRanking({ dryRun: false });

    logger.info('[DispatchRankings] Test email run completed', {
      batch_id: result.batch_id,
      requestId,
      saved: result.saved,
    });

    return res.status(200).json({
      batch_id: result.batch_id,
      message: 'Dispatch ranking email sent successfully',
      requestId,
      saved: result.saved,
    });
  } catch (error) {
    logger.error('[DispatchRankings] Test email run failed', {
      error: error.message,
      requestId,
      stack: error.stack,
    });

    return res.status(500).json({
      error: error.message,
      message: 'Failed to send dispatch ranking email',
      requestId,
    });
  }
}
