import {
  ENRICH_BATCH_DELAY_MS,
  ENRICH_BATCH_MAX,
  RANKING_FIELDS,
  RANKINGS_ERROR_CODE,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchRanking from '../../../models/tonkaDispatchRankings.model.js';
import { enrichRanking } from '../../../services/articleEnrichment.service.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// POST /dispatch-rankings/:id/enrich
// User-initiated: fetch article page, generate AI summary, save OG image.
// ----------------------------------------------------------------------------

export async function enrichRankingById(req, res) {
  try {
    const { id } = req.params;
    const refresh = req.body?.refresh === true;

    const ranking = await TonkaDispatchRanking.findById(id);
    if (!ranking) {
      return res.status(404).json({
        code: RANKINGS_ERROR_CODE.RANKING_NOT_FOUND,
        message: 'Ranking not found',
        requestId: req.id,
      });
    }

    if (!ranking[RANKING_FIELDS.LINK]) {
      return res.status(422).json({
        code: RANKINGS_ERROR_CODE.ENRICH_NO_LINK,
        message: 'Ranking has no article link to enrich from',
        requestId: req.id,
      });
    }

    logger.info('[EnrichController] Starting single enrichment', {
      rankingId: id,
      refresh,
      requestId: req.id,
    });

    const updated = await enrichRanking(ranking, refresh);

    return res.status(200).json({
      ranking: updated,
      requestId: req.id,
    });
  } catch (error) {
    logger.error('[EnrichController] Single enrichment failed', {
      error: error.message,
      rankingId: req.params.id,
      requestId: req.id,
    });

    return res.status(500).json({
      code: RANKINGS_ERROR_CODE.ENRICH_FAILED,
      message: 'Failed to enrich ranking',
      requestId: req.id,
    });
  }
}

// ----------------------------------------------------------------------------
// POST /dispatch-rankings/enrich/batch
// Accepts { ids: [...], refresh: bool }.
// Processes sequentially with a delay to avoid hammering Claude + article hosts.
// ----------------------------------------------------------------------------

export async function enrichRankingsBatch(req, res) {
  try {
    const { ids, refresh = false } = req.body ?? {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: RANKINGS_ERROR_CODE.ENRICH_MISSING_IDS,
        message: 'Request body must include a non-empty ids array',
        requestId: req.id,
      });
    }

    if (ids.length > ENRICH_BATCH_MAX) {
      return res.status(400).json({
        code: RANKINGS_ERROR_CODE.ENRICH_BATCH_TOO_LARGE,
        message: `Batch size cannot exceed ${ENRICH_BATCH_MAX}`,
        requestId: req.id,
      });
    }

    logger.info('[EnrichController] Starting batch enrichment', {
      count: ids.length,
      refresh,
      requestId: req.id,
    });

    const results = [];

    for (let i = 0; i < ids.length; i++) {
      const rankingId = ids[i];

      // Delay between requests (skip on first)
      if (i > 0) {
        await new Promise(resolve =>
          setTimeout(resolve, ENRICH_BATCH_DELAY_MS)
        );
      }

      try {
        const ranking = await TonkaDispatchRanking.findById(rankingId);
        if (!ranking) {
          results.push({
            error: 'Ranking not found',
            rankingId,
            status: 'skipped',
          });
          continue;
        }

        if (!ranking[RANKING_FIELDS.LINK]) {
          results.push({
            error: 'No article link',
            rankingId,
            status: 'skipped',
          });
          continue;
        }

        const updated = await enrichRanking(ranking, refresh);
        results.push({
          ranking: updated,
          rankingId,
          status: 'success',
        });
      } catch (err) {
        logger.warn('[EnrichController] Batch item failed', {
          error: err.message,
          rankingId,
          requestId: req.id,
        });
        results.push({
          error: err.message,
          rankingId,
          status: 'failed',
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    logger.info('[EnrichController] Batch enrichment complete', {
      failedCount,
      requestId: req.id,
      skippedCount,
      successCount,
      total: ids.length,
    });

    return res.status(200).json({
      failedCount,
      requestId: req.id,
      results,
      skippedCount,
      successCount,
      total: ids.length,
    });
  } catch (error) {
    logger.error('[EnrichController] Batch enrichment failed', {
      error: error.message,
      requestId: req.id,
    });

    return res.status(500).json({
      code: RANKINGS_ERROR_CODE.ENRICH_FAILED,
      message: 'Batch enrichment failed',
      requestId: req.id,
    });
  }
}
