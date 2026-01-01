import mongoose from 'mongoose';

import { NEWSLETTER_ERROR_CODE } from '../../../constants/tonkaDispatch.js';
import TonkaDispatchNewsletter from '../../../models/tonkaDispatchNewsletters.model.js';
import TonkaDispatchRanking from '../../../models/tonkaDispatchRankings.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Add an article to a newsletter (from ranking or manual section)
 * POST /api/dispatch/newsletters/:id/articles
 */
export async function addArticle(req, res) {
  try {
    const { id } = req.params;
    const {
      custom_category,
      custom_image_url,
      custom_link,
      custom_order,
      custom_snippet,
      custom_source_name,
      custom_title,
      is_manual_section,
      tonka_dispatch_rankings_id,
    } = req.body;

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

    // Validate manual section vs ranking article
    if (is_manual_section) {
      // Manual section - ensure no ranking ID
      if (tonka_dispatch_rankings_id) {
        logger.warn('Manual sections cannot reference rankings', {
          requestId: req.id,
        });

        return res.status(400).json({
          code: NEWSLETTER_ERROR_CODE.NEWSLETTER_UPDATE_FAILED,
          message: 'Manual sections cannot have tonka_dispatch_rankings_id',
          requestId: req.id,
        });
      }

      logger.info('Adding manual section to newsletter', {
        id,
        requestId: req.id,
      });
    } else {
      // Article from ranking - validate ranking exists
      if (!tonka_dispatch_rankings_id) {
        logger.warn('Non-manual articles require ranking ID', {
          requestId: req.id,
        });

        return res.status(400).json({
          code: NEWSLETTER_ERROR_CODE.NEWSLETTER_UPDATE_FAILED,
          message:
            'tonka_dispatch_rankings_id required for non-manual articles',
          requestId: req.id,
        });
      }

      if (!mongoose.Types.ObjectId.isValid(tonka_dispatch_rankings_id)) {
        logger.warn('Invalid ranking ID format', {
          requestId: req.id,
          tonka_dispatch_rankings_id,
        });

        return res.status(400).json({
          code: NEWSLETTER_ERROR_CODE.RANKING_NOT_FOUND,
          message: 'Invalid ranking ID format',
          requestId: req.id,
        });
      }

      // Check if ranking exists
      const ranking = await TonkaDispatchRanking.findById(
        tonka_dispatch_rankings_id
      );

      if (!ranking) {
        logger.warn('Ranking not found', {
          requestId: req.id,
          tonka_dispatch_rankings_id,
        });

        return res.status(404).json({
          code: NEWSLETTER_ERROR_CODE.RANKING_NOT_FOUND,
          message: 'Ranking not found',
          requestId: req.id,
        });
      }

      // Check for duplicate
      const isDuplicate = newsletter.articles.some(
        article =>
          article.tonka_dispatch_rankings_id &&
          article.tonka_dispatch_rankings_id.toString() ===
            tonka_dispatch_rankings_id
      );

      if (isDuplicate) {
        logger.warn('Article already in newsletter', {
          requestId: req.id,
          tonka_dispatch_rankings_id,
        });

        return res.status(400).json({
          code: NEWSLETTER_ERROR_CODE.DUPLICATE_ARTICLE,
          message: 'This article is already in the newsletter',
          requestId: req.id,
        });
      }

      logger.info('Adding article from ranking to newsletter', {
        id,
        requestId: req.id,
        tonka_dispatch_rankings_id,
      });
    }

    // Determine custom_order
    let order =
      custom_order !== undefined ? custom_order : newsletter.articles.length; // Default to end

    // If order conflicts, shift existing articles down
    if (order < newsletter.articles.length) {
      newsletter.articles.forEach(article => {
        if (article.custom_order >= order) {
          article.custom_order += 1;
        }
      });
    }

    // Build article object
    const article = {
      custom_category: custom_category || null,
      custom_image_url: custom_image_url || null,
      custom_link: custom_link || null,
      custom_order: order,
      custom_snippet: custom_snippet || null,
      custom_source_name: custom_source_name || null,
      custom_title: custom_title || null,
      is_manual_section: !!is_manual_section,
      tonka_dispatch_rankings_id: tonka_dispatch_rankings_id || null,
    };

    newsletter.articles.push(article);
    await newsletter.save();

    const addedArticle = newsletter.articles[newsletter.articles.length - 1];

    logger.info('Article added successfully', {
      article_id: addedArticle._id,
      custom_order: addedArticle.custom_order,
      id,
      is_manual: addedArticle.is_manual_section,
      requestId: req.id,
    });

    return res.status(200).json({
      article: addedArticle,
      newsletter,
      requestId: req.id,
      status: 'success',
    });
  } catch (error) {
    logger.error('Failed to add article', {
      error: error.message,
      id: req.params.id,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: NEWSLETTER_ERROR_CODE.NEWSLETTER_UPDATE_FAILED,
      message: 'Failed to add article',
      requestId: req.id,
    });
  }
}
