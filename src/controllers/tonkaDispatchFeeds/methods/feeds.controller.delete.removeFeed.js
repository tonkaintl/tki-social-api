import mongoose from 'mongoose';

import { FEED_ERROR_CODE } from '../../../constants/tonkaDispatch.js';
import TonkaDispatchRssLinks from '../../../models/tonkaDispatchRssLinks.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * DELETE /api/feeds/:id
 *
 * Hard-delete a feed row. Removes it from the collection entirely.
 *
 * For "stop polling this feed but keep the record around," use PATCH with
 * `{ enabled: false }` or `{ tier: 'rejected', notes: '...' }` instead.
 * Hard delete is for genuine cleanup (typos, dead feeds, accidental
 * inserts) where the row has no historical value.
 */
export async function removeFeed(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn('Invalid feed ID format on delete', {
        feedId: id,
        requestId: req.id,
      });
      return res.status(400).json({
        code: FEED_ERROR_CODE.INVALID_FEED_ID,
        message: 'Invalid feed ID format',
        requestId: req.id,
      });
    }

    const deleted = await TonkaDispatchRssLinks.findByIdAndDelete(id);

    if (!deleted) {
      logger.warn('Feed not found on delete', {
        feedId: id,
        requestId: req.id,
      });
      return res.status(404).json({
        code: FEED_ERROR_CODE.FEED_NOT_FOUND,
        message: 'Feed not found',
        requestId: req.id,
      });
    }

    logger.info('Feed deleted', {
      feedId: id,
      requestId: req.id,
      rss_url: deleted.rss_url,
    });

    return res.status(200).json({
      deleted: true,
      feed: deleted,
      requestId: req.id,
    });
  } catch (error) {
    logger.error('Failed to delete feed', {
      error: error.message,
      feedId: req.params.id,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: FEED_ERROR_CODE.FEED_DELETE_FAILED,
      message: 'Failed to delete feed',
      requestId: req.id,
    });
  }
}
