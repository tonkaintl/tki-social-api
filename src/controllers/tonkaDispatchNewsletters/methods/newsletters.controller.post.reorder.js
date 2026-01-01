import mongoose from 'mongoose';

import { NEWSLETTER_ERROR_CODE } from '../../../constants/tonkaDispatch.js';
import TonkaDispatchNewsletter from '../../../models/tonkaDispatchNewsletters.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Reorder articles in a newsletter
 * POST /api/dispatch/newsletters/:id/articles/reorder
 */
export async function reorderArticles(req, res) {
  try {
    const { id } = req.params;
    const { article_order } = req.body;

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

    if (!Array.isArray(article_order) || article_order.length === 0) {
      logger.warn('Invalid article_order format', {
        requestId: req.id,
      });

      return res.status(400).json({
        code: NEWSLETTER_ERROR_CODE.INVALID_ARTICLE_ORDER,
        message: 'article_order must be a non-empty array of article IDs',
        requestId: req.id,
      });
    }

    logger.info('Reordering articles in newsletter', {
      id,
      new_order_count: article_order.length,
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

    // Validate that all article IDs exist and count matches
    if (article_order.length !== newsletter.articles.length) {
      logger.warn('Article order count mismatch', {
        expected: newsletter.articles.length,
        provided: article_order.length,
        requestId: req.id,
      });

      return res.status(400).json({
        code: NEWSLETTER_ERROR_CODE.INVALID_ARTICLE_ORDER,
        message: `article_order must contain all ${newsletter.articles.length} article IDs`,
        requestId: req.id,
      });
    }

    // Validate all IDs exist
    const existingIds = newsletter.articles.map(a => a._id.toString());
    const missingIds = article_order.filter(id => !existingIds.includes(id));
    const extraIds = article_order.filter(
      id => !mongoose.Types.ObjectId.isValid(id)
    );

    if (missingIds.length > 0 || extraIds.length > 0) {
      logger.warn('Invalid article IDs in order', {
        extraIds,
        missingIds,
        requestId: req.id,
      });

      return res.status(400).json({
        code: NEWSLETTER_ERROR_CODE.INVALID_ARTICLE_ORDER,
        message: 'article_order contains invalid or non-existent article IDs',
        requestId: req.id,
      });
    }

    // Update custom_order based on array position
    article_order.forEach((articleId, index) => {
      const article = newsletter.articles.id(articleId);
      if (article) {
        article.custom_order = index;
        article.updated_at = new Date();
      }
    });

    await newsletter.save();

    logger.info('Articles reordered successfully', {
      id,
      requestId: req.id,
    });

    return res.status(200).json({
      newsletter,
      requestId: req.id,
      status: 'success',
    });
  } catch (error) {
    logger.error('Failed to reorder articles', {
      error: error.message,
      id: req.params.id,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: NEWSLETTER_ERROR_CODE.NEWSLETTER_UPDATE_FAILED,
      message: 'Failed to reorder articles',
      requestId: req.id,
    });
  }
}
