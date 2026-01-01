import {
  NEWSLETTER_ERROR_CODE,
  NEWSLETTER_STATUS,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchNewsletter from '../../../models/tonkaDispatchNewsletters.model.js';
import TonkaDispatchRanking from '../../../models/tonkaDispatchRankings.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Create a new newsletter, optionally from a rankings batch
 * POST /api/dispatch/newsletters
 */
export async function createNewsletter(req, res) {
  try {
    const {
      hero_image_url,
      ranking_ids,
      source_batch_id,
      status,
      testing_emails,
      title,
    } = req.body;

    if (!title || title.trim() === '') {
      logger.warn('Newsletter title is required', { requestId: req.id });
      return res.status(400).json({
        code: NEWSLETTER_ERROR_CODE.NEWSLETTER_CREATE_FAILED,
        message: 'Newsletter title is required',
        requestId: req.id,
      });
    }

    logger.info('Creating newsletter', {
      has_batch: !!source_batch_id,
      has_ranking_ids: !!ranking_ids,
      requestId: req.id,
      title,
    });

    // Build newsletter object
    const newsletterData = {
      hero_image_url: hero_image_url || null,
      source_batch_id: source_batch_id || null,
      status: status || NEWSLETTER_STATUS.DRAFT,
      testing_emails: testing_emails || [],
      title: title.trim(),
    };

    // If creating from rankings batch or specific rankings, fetch and add articles
    const articles = [];

    if (source_batch_id || ranking_ids) {
      let rankings = [];

      if (ranking_ids && Array.isArray(ranking_ids) && ranking_ids.length > 0) {
        // Fetch specific rankings by ID
        rankings = await TonkaDispatchRanking.find({
          _id: { $in: ranking_ids },
        }).sort({ rank: 1 });

        logger.info('Found rankings by IDs', {
          count: rankings.length,
          requestId: req.id,
        });
      } else if (source_batch_id) {
        // Fetch all rankings from batch
        rankings = await TonkaDispatchRanking.find({
          batch_id: source_batch_id,
        }).sort({ rank: 1 });

        logger.info('Found rankings by batch_id', {
          batch_id: source_batch_id,
          count: rankings.length,
          requestId: req.id,
        });
      }

      // Convert rankings to article objects
      rankings.forEach((ranking, index) => {
        articles.push({
          custom_order: index,
          is_manual_section: false,
          tonka_dispatch_rankings_id: ranking._id,
        });
      });
    }

    newsletterData.articles = articles;

    // Create newsletter
    const newsletter = await TonkaDispatchNewsletter.create(newsletterData);

    logger.info('Newsletter created successfully', {
      articles_count: newsletter.articles.length,
      newsletter_id: newsletter._id,
      requestId: req.id,
      status: newsletter.status,
    });

    return res.status(201).json({
      newsletter,
      requestId: req.id,
      status: 'success',
    });
  } catch (error) {
    logger.error('Failed to create newsletter', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: NEWSLETTER_ERROR_CODE.NEWSLETTER_CREATE_FAILED,
      message: 'Failed to create newsletter',
      requestId: req.id,
    });
  }
}
