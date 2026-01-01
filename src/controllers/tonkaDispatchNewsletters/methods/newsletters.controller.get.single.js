import mongoose from 'mongoose';

import { NEWSLETTER_ERROR_CODE } from '../../../constants/tonkaDispatch.js';
import TonkaDispatchNewsletter from '../../../models/tonkaDispatchNewsletters.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Get a single newsletter by ID with optional ranking population
 * GET /api/dispatch/newsletters/:id
 */
export async function getNewsletter(req, res) {
  try {
    const { id } = req.params;
    const { populate_rankings } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn('Invalid newsletter ID format', {
        id,
        requestId: req.id,
      });

      return res.status(400).json({
        code: NEWSLETTER_ERROR_CODE.NEWSLETTER_NOT_FOUND,
        message: 'Invalid newsletter ID format',
        requestId: req.id,
      });
    }

    logger.info('Retrieving newsletter', {
      id,
      populate_rankings: populate_rankings === 'true',
      requestId: req.id,
    });

    let query = TonkaDispatchNewsletter.findById(id);

    // Populate rankings if requested (default true)
    if (populate_rankings !== 'false') {
      query = query.populate('articles.tonka_dispatch_rankings_id');
    }

    const newsletter = await query;

    if (!newsletter) {
      logger.warn('Newsletter not found', {
        id,
        requestId: req.id,
      });

      return res.status(404).json({
        code: NEWSLETTER_ERROR_CODE.NEWSLETTER_NOT_FOUND,
        message: 'Newsletter not found',
        requestId: req.id,
      });
    }

    logger.info('Newsletter retrieved successfully', {
      articles_count: newsletter.articles.length,
      id,
      requestId: req.id,
      status: newsletter.status,
    });

    return res.status(200).json({
      newsletter,
      requestId: req.id,
    });
  } catch (error) {
    logger.error('Failed to retrieve newsletter', {
      error: error.message,
      id: req.params.id,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: NEWSLETTER_ERROR_CODE.NEWSLETTER_LIST_FAILED,
      message: 'Failed to retrieve newsletter',
      requestId: req.id,
    });
  }
}
