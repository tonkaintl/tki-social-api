import mongoose from 'mongoose';

import {
  NEWSLETTER_ERROR_CODE,
  NEWSLETTER_STATUS,
  NEWSLETTER_UPDATE_FIELDS_VALUES,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchNewsletter from '../../../models/tonkaDispatchNewsletters.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Update newsletter metadata
 * PATCH /api/dispatch/newsletters/:id
 */
export async function updateNewsletter(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

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

    // Validate update fields
    const invalidFields = Object.keys(updates).filter(
      field => !NEWSLETTER_UPDATE_FIELDS_VALUES.includes(field)
    );

    if (invalidFields.length > 0) {
      logger.warn('Invalid update fields provided', {
        invalidFields,
        requestId: req.id,
      });

      return res.status(400).json({
        code: NEWSLETTER_ERROR_CODE.NEWSLETTER_UPDATE_FAILED,
        message: `Invalid fields: ${invalidFields.join(', ')}. Allowed: ${NEWSLETTER_UPDATE_FIELDS_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }

    if (Object.keys(updates).length === 0) {
      logger.warn('No update fields provided', { requestId: req.id });

      return res.status(400).json({
        code: NEWSLETTER_ERROR_CODE.NEWSLETTER_UPDATE_FAILED,
        message: 'No update fields provided',
        requestId: req.id,
      });
    }

    logger.info('Updating newsletter', {
      id,
      requestId: req.id,
      update_fields: Object.keys(updates),
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

    // Validate status transitions
    if (updates.status) {
      const currentStatus = newsletter.status;
      const newStatus = updates.status;

      // Cannot unsend a newsletter
      if (currentStatus === NEWSLETTER_STATUS.SENT) {
        logger.warn('Cannot modify sent newsletter status', {
          currentStatus,
          newStatus,
          requestId: req.id,
        });

        return res.status(400).json({
          code: NEWSLETTER_ERROR_CODE.INVALID_STATUS_TRANSITION,
          message: 'Cannot change status of sent newsletter',
          requestId: req.id,
        });
      }

      // Validate scheduled_date when transitioning to scheduled
      if (
        newStatus === NEWSLETTER_STATUS.SCHEDULED &&
        !updates.scheduled_date &&
        !newsletter.scheduled_date
      ) {
        logger.warn('Scheduled date required for scheduled status', {
          requestId: req.id,
        });

        return res.status(400).json({
          code: NEWSLETTER_ERROR_CODE.NEWSLETTER_UPDATE_FAILED,
          message: 'scheduled_date is required when status is scheduled',
          requestId: req.id,
        });
      }

      // Auto-set sent_date when transitioning to sent
      if (newStatus === NEWSLETTER_STATUS.SENT && !newsletter.sent_date) {
        updates.sent_date = new Date();
      }
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      newsletter[key] = updates[key];
    });

    await newsletter.save();

    logger.info('Newsletter updated successfully', {
      id,
      requestId: req.id,
      status: newsletter.status,
    });

    return res.status(200).json({
      newsletter,
      requestId: req.id,
      status: 'success',
    });
  } catch (error) {
    logger.error('Failed to update newsletter', {
      error: error.message,
      id: req.params.id,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: NEWSLETTER_ERROR_CODE.NEWSLETTER_UPDATE_FAILED,
      message: 'Failed to update newsletter',
      requestId: req.id,
    });
  }
}
