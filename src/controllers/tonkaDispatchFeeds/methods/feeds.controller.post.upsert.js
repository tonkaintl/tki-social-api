import {
  FEED_ERROR_CODE,
  FEED_FIELDS,
  FEED_TIER,
  FEED_TIER_VALUES,
} from '../../../constants/tonkaDispatch.js';
import TonkaDispatchRssLinks from '../../../models/tonkaDispatchRssLinks.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Upsert a feed by RSS URL (create or update)
 */
export async function upsertFeed(req, res) {
  try {
    const {
      category,
      enabled,
      feedspot_feed_id,
      feedspot_folder_id,
      name,
      notes,
      rejected_reason,
      requires_browser,
      rss_url,
      tier,
    } = req.body;

    // Validate required fields
    if (!rss_url || rss_url.trim() === '') {
      logger.warn('Missing RSS URL in upsert request', {
        requestId: req.id,
      });

      return res.status(400).json({
        code: FEED_ERROR_CODE.MISSING_RSS_URL,
        message: 'RSS URL is required',
        requestId: req.id,
      });
    }

    // Validate tier if provided
    if (tier && !FEED_TIER_VALUES.includes(tier)) {
      logger.warn('Invalid tier value', {
        requestId: req.id,
        tier,
      });

      return res.status(400).json({
        code: FEED_ERROR_CODE.INVALID_TIER,
        message: `Tier must be one of: ${FEED_TIER_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }

    // Validate notes required for rejected tier
    if (tier === FEED_TIER.REJECTED && (!notes || notes.trim() === '')) {
      logger.warn('Notes required for rejected tier', {
        requestId: req.id,
        tier,
      });

      return res.status(400).json({
        code: FEED_ERROR_CODE.NOT_REQUIRED_FOR_REJECTED,
        message: `Notes are required when tier is "${FEED_TIER.REJECTED}"`,
        requestId: req.id,
      });
    }

    // Normalize RSS URL
    const normalizedUrl = rss_url.trim().toLowerCase();

    // Build update object (only include fields that were provided)
    const updateFields = {
      rss_url: normalizedUrl,
      updated_at: new Date(),
    };

    if (name !== undefined) updateFields.name = name;
    if (category !== undefined) updateFields.category = category;
    if (tier !== undefined) updateFields.tier = tier;
    if (notes !== undefined) updateFields.notes = notes;
    if (enabled !== undefined) updateFields.enabled = enabled;
    if (feedspot_feed_id !== undefined)
      updateFields.feedspot_feed_id = feedspot_feed_id;
    if (feedspot_folder_id !== undefined)
      updateFields.feedspot_folder_id = feedspot_folder_id;
    if (rejected_reason !== undefined)
      updateFields.rejected_reason = rejected_reason;
    if (requires_browser !== undefined)
      updateFields.requires_browser = requires_browser;

    logger.info('Upserting feed', {
      requestId: req.id,
      rss_url: normalizedUrl,
    });

    // Perform upsert operation
    const result = await TonkaDispatchRssLinks.findOneAndUpdate(
      { [FEED_FIELDS.RSS_URL]: normalizedUrl },
      { $set: updateFields },
      {
        new: true, // Return updated document
        runValidators: true,
        upsert: true, // Create if doesn't exist
      }
    );

    // Check if this was a create or update
    // Note: MongoDB doesn't directly tell us, so we'll approximate
    const wasCreated =
      result[FEED_FIELDS.CREATED_AT].getTime() ===
      result[FEED_FIELDS.UPDATED_AT].getTime();

    logger.info('Feed upserted successfully', {
      created: wasCreated,
      feedId: result._id,
      requestId: req.id,
      rss_url: normalizedUrl,
      tier: result.tier,
    });

    return res.status(200).json({
      created: wasCreated,
      feed: result,
      requestId: req.id,
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      logger.warn('Feed validation failed', {
        error: error.message,
        requestId: req.id,
      });

      return res.status(400).json({
        code: FEED_ERROR_CODE.VALIDATION_ERROR,
        message: error.message,
        requestId: req.id,
      });
    }

    // Handle duplicate key errors (shouldn't happen with upsert, but defensive)
    if (error.code === 11000) {
      logger.warn('Duplicate RSS URL', {
        error: error.message,
        requestId: req.id,
      });

      return res.status(400).json({
        code: FEED_ERROR_CODE.DUPLICATE_RSS_URL,
        message: 'A feed with this RSS URL already exists',
        requestId: req.id,
      });
    }

    logger.error('Failed to upsert feed', {
      error: error.message,
      requestId: req.id,
      stack: error.stack,
    });

    return res.status(500).json({
      code: FEED_ERROR_CODE.FEED_UPSERT_FAILED,
      message: 'Failed to upsert feed',
      requestId: req.id,
    });
  }
}
