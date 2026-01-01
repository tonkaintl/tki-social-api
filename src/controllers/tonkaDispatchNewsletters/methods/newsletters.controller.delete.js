import mongoose from 'mongoose';

import { NEWSLETTER_ERROR_CODE } from '../../../constants/tonkaDispatch.js';
import TonkaDispatchNewsletter from '../../../models/tonkaDispatchNewsletters.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Delete a newsletter
 * DELETE /api/dispatch/newsletters/:id
 */
export async function deleteNewsletter(req, res) {
  try {
    const { id } = req.params;

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

    logger.info('Deleting newsletter', {
      id,
      requestId: req.id,
    });

    const newsletter = await TonkaDispatchNewsletter.findByIdAndDelete(id);

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

    logger.info('Newsletter deleted successfully', {
      id,
      requestId: req.id,
    });

    return res.status(200).json({
      message: 'Newsletter deleted successfully',
      requestId: req.id,
      status: 'success',
    });
  } catch (error) {
    logger.error('Failed to delete newsletter', {
      error: error.message,
      id: req.params.id,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: NEWSLETTER_ERROR_CODE.NEWSLETTER_DELETE_FAILED,
      message: 'Failed to delete newsletter',
      requestId: req.id,
    });
  }
}
