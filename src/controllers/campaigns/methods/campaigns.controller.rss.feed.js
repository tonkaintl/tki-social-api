/**
 * RSS Feed Controller
 * Generates RSS 2.0 feed for social media campaigns focused on Binder items
 */

import { z } from 'zod';

import { BinderAdapter } from '../../../adapters/binder/binder.adapter.js';
import { config } from '../../../config/env.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const RSS_DEFAULTS = {
  DESCRIPTION: 'Latest inventory items from TKI Social',
  LIMIT: 30,
  TITLE: 'TKI Social - Inventory Feed',
};

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const rssQuerySchema = z.object({
  description: z.string().optional().default(RSS_DEFAULTS.DESCRIPTION),
  endDate: z.string().datetime().optional(), // ISO 8601 date string
  limit: z.coerce.number().int().min(1).max(100).default(RSS_DEFAULTS.LIMIT),
  startDate: z.string().datetime().optional(), // ISO 8601 date string
  status: z
    .enum(['pending', 'draft', 'scheduled', 'published', 'failed'])
    .optional(),
  title: z.string().optional().default(RSS_DEFAULTS.TITLE),
});

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------

/**
 * Escape XML special characters
 */
const escapeXml = text => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Format date for RSS (RFC 822)
 */
const formatRssDate = date => {
  return new Date(date).toUTCString();
};

/**
 * Generate RSS item XML for a campaign
 */
const generateRssItem = (campaign, binderItem) => {
  const title = escapeXml(campaign.title);
  const description = escapeXml(
    campaign.description || binderItem?.description || ''
  );
  const link = escapeXml(campaign.url);
  const guid = escapeXml(campaign.stock_number);
  const pubDate = formatRssDate(campaign.created_at);

  // Build media enclosures from campaign-level media
  const enclosures =
    campaign.media_urls
      ?.filter(media => media.url && media.media_type)
      .map(media => {
        const url = escapeXml(media.url);
        const type =
          media.media_type === 'image'
            ? 'image/jpeg'
            : 'application/octet-stream';
        const length = media.size || 0;
        return `    <enclosure url="${url}" type="${type}" length="${length}" />`;
      })
      .join('\n') || '';

  // Enhanced description with Binder data
  const enhancedDescription = binderItem
    ? `${description}\n\nStock Number: ${campaign.stock_number}\nMake: ${binderItem.make || 'N/A'}\nModel: ${binderItem.model || 'N/A'}\nYear: ${binderItem.year || 'N/A'}`
    : description;

  return `  <item>
    <title>${title}</title>
    <description><![CDATA[${enhancedDescription}]]></description>
    <link>${link}</link>
    <guid isPermaLink="false">${guid}</guid>
    <pubDate>${pubDate}</pubDate>
${enclosures}
  </item>`;
};

/**
 * Generate complete RSS feed XML
 */
const generateRssXml = (campaigns, binderItems, feedTitle, feedDescription) => {
  const title = escapeXml(feedTitle);
  const description = escapeXml(feedDescription);
  const link = escapeXml('https://tonkaintl.com');
  const buildDate = formatRssDate(new Date());

  const items = campaigns
    .map(campaign => {
      const binderItem = binderItems[campaign.stock_number];
      return generateRssItem(campaign, binderItem);
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${title}</title>
    <description>${description}</description>
    <link>${link}</link>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <generator>TKI Social API</generator>
    <language>en-us</language>
${items}
  </channel>
</rss>`;
};

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Generate RSS Feed for Social Campaigns
 * GET /social/rss
 */
export const generateRssFeed = async (req, res, next) => {
  try {
    const validationResult = rssQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        validationResult.error.errors
      );
      return res.status(error.statusCode).json({
        code: error.code,
        errors: error.details,
        message: error.message,
        requestId: req.id,
      });
    }

    const { description, endDate, limit, startDate, status, title } =
      validationResult.data;

    logger.info('Generating RSS feed', {
      endDate,
      limit,
      requestId: req.id,
      startDate,
      status,
    });

    // Build query filter
    const filter = {};
    if (status) filter.status = status;

    // Date range filtering
    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) filter.created_at.$gte = new Date(startDate);
      if (endDate) filter.created_at.$lte = new Date(endDate);
    }

    // Fetch campaigns with campaign-level media
    const campaigns = await SocialCampaigns.find(filter)
      .sort({ created_at: -1 })
      .limit(limit)
      .select({
        base_message: 1,
        created_at: 1,
        description: 1,
        media_urls: 1, // Include campaign-level media
        stock_number: 1,
        title: 1,
        url: 1,
      })
      .lean();

    if (!campaigns.length) {
      logger.info('No campaigns found for RSS feed', {
        requestId: req.id,
      });

      // Return empty RSS feed
      const emptyFeed = generateRssXml([], {}, title, description);
      return res
        .set('Content-Type', 'application/rss+xml; charset=utf-8')
        .status(200)
        .send(emptyFeed);
    }

    // Fetch Binder data for enrichment
    const binderAdapter = new BinderAdapter(config);
    const binderItems = {};

    // Fetch Binder items in parallel
    const binderPromises = campaigns.map(async campaign => {
      try {
        const item = await binderAdapter.getItem(campaign.stock_number);
        binderItems[campaign.stock_number] = item;
      } catch (error) {
        logger.warn('Failed to fetch Binder item for RSS', {
          error: error.message,
          stockNumber: campaign.stock_number,
        });
        // Continue without Binder data for this item
      }
    });

    await Promise.allSettled(binderPromises);

    // Generate RSS XML
    const rssXml = generateRssXml(campaigns, binderItems, title, description);

    logger.info('RSS feed generated successfully', {
      campaignCount: campaigns.length,
      requestId: req.id,
    });

    return res
      .set('Content-Type', 'application/rss+xml; charset=utf-8')
      .status(200)
      .send(rssXml);
  } catch (error) {
    logger.error('Failed to generate RSS feed', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    next(error);
  }
};
