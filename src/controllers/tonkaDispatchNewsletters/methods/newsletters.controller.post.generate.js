import mongoose from 'mongoose';

import {
  NEWSLETTER_ERROR_CODE,
  NEWSLETTER_STATUS,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchNewsletter from '../../../models/tonkaDispatchNewsletters.model.js';
import { generateNewsletterBroadcastHtml } from '../../../services/html/generateNewsletterBroadcastHtml.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Map a newsletter article (with populated ranking) to the renderer item shape
// expected by generateNewsletterBroadcastHtml.
// ----------------------------------------------------------------------------
function articleToItem(article) {
  const ranking = article.tonka_dispatch_rankings_id || {};
  const a =
    typeof article.toObject === 'function' ? article.toObject() : article;
  const r =
    typeof ranking.toObject === 'function' ? ranking.toObject() : ranking;

  const publishedLabel = r.pub_date_ms
    ? new Date(r.pub_date_ms).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return {
    article_url: a.custom_link || r.link || '',
    canonical_id: r.canonical_id || String(a._id || ''),
    creator: r.creator || '',
    custom_byline: '',
    custom_snippet: a.custom_snippet || '',
    custom_title: a.custom_title || '',
    hero_image_url: a.custom_image_url || r.og_image_url || '',
    published_label: publishedLabel,
    snippet: r.ai_summary || r.snippet || r.og_description || '',
    source_name: a.custom_source_name || r.source_name || '',
    title: a.custom_title || r.og_title || r.title || '',
    writer: r.creator || '',
  };
}

/**
 * Generate (or regenerate) the HTML body for a dispatch newsletter and bump
 * its status to "generated".
 * POST /api/dispatch/newsletters/:id/generate
 */
export async function generateNewsletter(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn('Invalid newsletter ID format', { id, requestId: req.id });
      return res.status(400).json({
        code: NEWSLETTER_ERROR_CODE.NEWSLETTER_NOT_FOUND,
        message: 'Invalid newsletter ID format',
        requestId: req.id,
      });
    }

    const newsletter = await TonkaDispatchNewsletter.findById(id).populate(
      'articles.tonka_dispatch_rankings_id'
    );

    if (!newsletter) {
      logger.warn('Newsletter not found', { id, requestId: req.id });
      return res.status(404).json({
        code: NEWSLETTER_ERROR_CODE.NEWSLETTER_NOT_FOUND,
        message: 'Newsletter not found',
        requestId: req.id,
      });
    }

    if (
      !Array.isArray(newsletter.articles) ||
      newsletter.articles.length === 0
    ) {
      return res.status(400).json({
        code: NEWSLETTER_ERROR_CODE.GENERATE_FAILED,
        message: 'Newsletter must have at least one article to generate',
        requestId: req.id,
      });
    }

    const orderedArticles = [...newsletter.articles].sort(
      (a, b) => (a.custom_order ?? 0) - (b.custom_order ?? 0)
    );
    const items = orderedArticles.map(articleToItem);

    const html = generateNewsletterBroadcastHtml({
      items,
      preview_text: '',
      subject_line: newsletter.title,
      title: newsletter.title,
    });

    newsletter.html_content = html;
    newsletter.status = NEWSLETTER_STATUS.GENERATED;
    await newsletter.save();

    logger.info('Newsletter HTML generated', {
      articles_count: items.length,
      newsletter_id: newsletter._id,
      requestId: req.id,
      status: newsletter.status,
    });

    return res.status(200).json({
      newsletter,
      requestId: req.id,
      status: 'success',
    });
  } catch (error) {
    logger.error('Failed to generate newsletter HTML', {
      error: error.message,
      id: req.params.id,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: NEWSLETTER_ERROR_CODE.GENERATE_FAILED,
      message: 'Failed to generate newsletter HTML',
      requestId: req.id,
    });
  }
}
