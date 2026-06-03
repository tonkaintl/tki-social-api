import mongoose from 'mongoose';

import { NEWSLETTER_ERROR_CODE } from '../../../constants/tonkaDispatch.js';
import TonkaDispatchNewsletter from '../../../models/tonkaDispatchNewsletters.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Toggle the user-controlled "used" flag on a newsletter.
 * The desired state must be supplied explicitly as a boolean.
 * PATCH /api/dispatch/newsletters/:id/used
 * Body: { is_used: boolean }
 */
export async function toggleNewsletterUsed(req, res) {
  try {
    const { id } = req.params;
    const { is_used } = req.body;

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

    if (typeof is_used !== 'boolean') {
      logger.warn('is_used must be a boolean', {
        id,
        is_used,
        requestId: req.id,
      });

      return res.status(400).json({
        code: NEWSLETTER_ERROR_CODE.NEWSLETTER_UPDATE_FAILED,
        message: 'is_used is required and must be a boolean',
        requestId: req.id,
      });
    }

    logger.info('Toggling newsletter used flag', {
      id,
      is_used,
      requestId: req.id,
    });

    const newsletter = await TonkaDispatchNewsletter.findById(id);

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

    newsletter.is_used = is_used;
    await newsletter.save();

    logger.info('Newsletter used flag updated successfully', {
      id,
      is_used: newsletter.is_used,
      requestId: req.id,
    });

    return res.status(200).json({
      newsletter,
      requestId: req.id,
      status: 'success',
    });
  } catch (error) {
    logger.error('Failed to toggle newsletter used flag', {
      error: error.message,
      id: req.params.id,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: NEWSLETTER_ERROR_CODE.NEWSLETTER_UPDATE_FAILED,
      message: 'Failed to toggle newsletter used flag',
      requestId: req.id,
    });
  }
}
