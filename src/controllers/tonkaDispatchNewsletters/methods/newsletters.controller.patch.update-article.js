import mongoose from 'mongoose';

import {
  ARTICLE_UPDATE_FIELDS_VALUES,
  NEWSLETTER_ERROR_CODE,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchNewsletter from '../../../models/tonkaDispatchNewsletters.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Update article overrides in a newsletter
 * PATCH /api/dispatch/newsletters/:id/articles/:article_id
 */
export async function updateArticle(req, res) {
  try {
    const { article_id, id } = req.params;
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

    if (!mongoose.Types.ObjectId.isValid(article_id)) {
      logger.warn('Invalid article ID format', {
        article_id,
        requestId: req.id,
      });

      return res.status(400).json({
        code: NEWSLETTER_ERROR_CODE.ARTICLE_NOT_FOUND,
        message: 'Invalid article ID format',
        requestId: req.id,
      });
    }

    // Validate update fields
    const invalidFields = Object.keys(updates).filter(
      field => !ARTICLE_UPDATE_FIELDS_VALUES.includes(field)
    );

    if (invalidFields.length > 0) {
      logger.warn('Invalid update fields provided', {
        invalidFields,
        requestId: req.id,
      });

      return res.status(400).json({
        code: NEWSLETTER_ERROR_CODE.NEWSLETTER_UPDATE_FAILED,
        message: `Invalid fields: ${invalidFields.join(', ')}. Allowed: ${ARTICLE_UPDATE_FIELDS_VALUES.join(', ')}`,
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

    logger.info('Updating article in newsletter', {
      article_id,
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

    const article = newsletter.articles.id(article_id);

    if (!article) {
      logger.warn('Article not found in newsletter', {
        article_id,
        id,
        requestId: req.id,
      });

      return res.status(404).json({
        code: NEWSLETTER_ERROR_CODE.ARTICLE_NOT_FOUND,
        message: 'Article not found in newsletter',
        requestId: req.id,
      });
    }

    // Apply updates
    Object.keys(updates).forEach(key => {
      article[key] = updates[key];
    });

    article.updated_at = new Date();

    await newsletter.save();

    logger.info('Article updated successfully', {
      article_id,
      id,
      requestId: req.id,
    });

    return res.status(200).json({
      article,
      newsletter,
      requestId: req.id,
      status: 'success',
    });
  } catch (error) {
    logger.error('Failed to update article', {
      article_id: req.params.article_id,
      error: error.message,
      id: req.params.id,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: NEWSLETTER_ERROR_CODE.NEWSLETTER_UPDATE_FAILED,
      message: 'Failed to update article',
      requestId: req.id,
    });
  }
}
