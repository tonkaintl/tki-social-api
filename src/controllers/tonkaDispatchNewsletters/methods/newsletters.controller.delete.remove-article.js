import mongoose from 'mongoose';

import { NEWSLETTER_ERROR_CODE } from '../../../constants/tonkaDispatch.js';
import TonkaDispatchNewsletter from '../../../models/tonkaDispatchNewsletters.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Remove an article from a newsletter
 * DELETE /api/dispatch/newsletters/:id/articles/:article_id
 */
export async function removeArticle(req, res) {
  try {
    const { article_id, id } = req.params;

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

    logger.info('Removing article from newsletter', {
      article_id,
      id,
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

    const removedOrder = article.custom_order;

    // Remove the article
    newsletter.articles.pull(article_id);

    // Recalculate custom_order for remaining articles
    newsletter.articles
      .filter(a => a.custom_order > removedOrder)
      .forEach(a => {
        a.custom_order -= 1;
      });

    await newsletter.save();

    logger.info('Article removed successfully', {
      article_id,
      id,
      requestId: req.id,
    });

    return res.status(200).json({
      message: 'Article removed successfully',
      newsletter,
      requestId: req.id,
      status: 'success',
    });
  } catch (error) {
    logger.error('Failed to remove article', {
      article_id: req.params.article_id,
      error: error.message,
      id: req.params.id,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: NEWSLETTER_ERROR_CODE.NEWSLETTER_UPDATE_FAILED,
      message: 'Failed to remove article',
      requestId: req.id,
    });
  }
}
