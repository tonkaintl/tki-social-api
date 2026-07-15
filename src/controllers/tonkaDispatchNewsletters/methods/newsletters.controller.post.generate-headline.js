import mongoose from 'mongoose';

import { NEWSLETTER_ERROR_CODE } from '../../../constants/tonkaDispatch.js';
import TonkaDispatchNewsletter from '../../../models/tonkaDispatchNewsletters.model.js';
import { generateNewsletterHeadline } from '../../../services/newsletterHeadline.service.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Generate reader-facing Beehiiv title / subtitle from a newsletter's articles.
//
// Three POST routes share this handler (mode = title | subtitle | both). They
// return freshly generated copy but DO NOT persist it — the user regenerates
// until happy, may hand-edit, then saves the chosen values via PATCH. This
// preserves "choose, then save" semantics.
// ----------------------------------------------------------------------------

async function handleGenerate(req, res, mode) {
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

  if (!Array.isArray(newsletter.articles) || newsletter.articles.length === 0) {
    logger.warn('Cannot generate headline — no articles', {
      id,
      requestId: req.id,
    });
    return res.status(422).json({
      code: NEWSLETTER_ERROR_CODE.NO_ARTICLES,
      message: 'Newsletter has no articles to summarize',
      requestId: req.id,
    });
  }

  try {
    const result = await generateNewsletterHeadline({ mode, newsletter });

    logger.info('Newsletter headline generated', {
      fields: Object.keys(result),
      id,
      mode,
      requestId: req.id,
    });

    return res.status(200).json({
      ...result,
      requestId: req.id,
      status: 'success',
    });
  } catch (error) {
    logger.error('Failed to generate newsletter headline', {
      error: error.message,
      id,
      mode,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(502).json({
      code: NEWSLETTER_ERROR_CODE.AI_GENERATION_FAILED,
      message: 'Failed to generate newsletter copy',
      requestId: req.id,
    });
  }
}

export function generateNewsletterTitle(req, res) {
  return handleGenerate(req, res, 'title');
}

export function generateNewsletterSubtitle(req, res) {
  return handleGenerate(req, res, 'subtitle');
}

export function generateNewsletterTitleSubtitle(req, res) {
  return handleGenerate(req, res, 'both');
}
