// ----------------------------------------------------------------------------
// PUT /metricool/posts/:postId
// Update a draft or scheduled post in Metricool and return updated campaign
// ----------------------------------------------------------------------------

import { z } from 'zod';

import { MetricoolClient } from '../../../adapters/metricool/metricool.client.js';
import { config } from '../../../config/env.js';
import { METRICOOL_STATUS } from '../../../constants/campaigns.js';
import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// Request validation schema for updating a post
const updateMetricoolPostSchema = z.object({
  draft: z.boolean().optional(),
  media: z.array(z.string().url()).optional(), // Array of media URLs
  scheduledDate: z
    .string()
    .datetime('Invalid scheduled date format')
    .optional()
    .transform(date => {
      if (!date) return undefined;
      return new Date(date).toISOString().slice(0, 19);
    }),
  stockNumber: z.string().min(1, 'Stock number is required').optional(), // For campaign association
  text: z.string().optional(),
});

/**
 * Update a draft or scheduled post in Metricool and return updated campaign
 * PUT /metricool/posts/:postId
 */
export const updateMetricoolPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const validationResult = updateMetricoolPostSchema.safeParse(req.body);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');

      logger.warn('Metricool post update validation failed', {
        body: req.body,
        errors: validationResult.error.errors,
        postId,
      });

      return res.status(400).json({
        error: validationResult.error.errors,
        message: `Validation failed: ${errorMessage}`,
      });
    }

    const { draft, media, scheduledDate, stockNumber, text } =
      validationResult.data;

    // Find the campaign and proposed post with this Metricool ID
    const filter = {
      'proposed_posts.metricool_id': postId,
    };
    if (stockNumber) {
      filter.stock_number = stockNumber;
    }

    const campaign = await SocialCampaigns.findOne(filter);
    if (!campaign) {
      logger.warn('Campaign or Metricool post not found for update', {
        postId,
        stockNumber,
      });

      const error = new ApiError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        stockNumber
          ? 'Campaign or Metricool post not found'
          : 'Metricool post not found in any campaign',
        404
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: null,
        message: error.message,
      });
    }

    const proposedPost = campaign.proposed_posts.find(
      post => post.metricool_id === postId
    );
    if (!proposedPost) {
      logger.warn('Proposed post not found for update', {
        postId,
        stockNumber: campaign.stock_number,
      });

      const error = new ApiError(
        ERROR_CODES.RESOURCE_NOT_FOUND,
        'Proposed post not found',
        404
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: null,
        message: error.message,
      });
    }

    // Only allow updates to posts with PENDING status
    // (Metricool uses PENDING for both drafts and scheduled posts)
    if (proposedPost.metricool_status !== METRICOOL_STATUS.PENDING) {
      logger.warn('Cannot update post that is not PENDING', {
        metricoolStatus: proposedPost.metricool_status,
        postId,
        stockNumber: campaign.stock_number,
      });

      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        `Cannot update post with status '${proposedPost.metricool_status}'. Only posts with PENDING status can be updated.`,
        400
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: null,
        message: error.message,
      });
    }

    // Initialize Metricool client
    const metricoolClient = new MetricoolClient(config);

    try {
      // WORKAROUND: Metricool's update endpoint doesn't work reliably
      // Strategy: Delete the old post and create a new one with updated data

      logger.info('Fetching existing Metricool post for recreation', {
        postId,
        stockNumber: campaign.stock_number,
      });

      let existingPost = null;
      let shouldDelete = false;

      try {
        const existingPostResponse = await metricoolClient.getPost(postId);

        if (existingPostResponse?.data) {
          existingPost = existingPostResponse.data;
          shouldDelete = true;
          logger.info(
            'Found existing Metricool post, will delete and recreate',
            {
              postId,
              stockNumber: campaign.stock_number,
            }
          );
        }
      } catch (getError) {
        // Post doesn't exist in Metricool (404) - that's OK, we'll create a new one
        logger.warn('Metricool post not found, will create new post only', {
          error: getError.message,
          postId,
          stockNumber: campaign.stock_number,
        });
      }

      // Step 1: Delete the existing post (if it exists)
      if (shouldDelete) {
        logger.info('Deleting existing Metricool post', {
          postId,
          stockNumber: campaign.stock_number,
        });

        await metricoolClient.deletePost(postId);

        logger.info('Successfully deleted existing Metricool post', {
          postId,
          stockNumber: campaign.stock_number,
        });
      }

      // Step 2: Build new post payload using the working POST format
      // Determine publication date - format: yyyy-MM-dd'T'HH:mm:ss (no milliseconds)
      // ⚠️ CRITICAL: Metricool ONLY accepts "UTC" timezone - any other timezone causes silent failures
      let publicationDate;
      if (scheduledDate) {
        // scheduledDate is already formatted by Zod transform as YYYY-MM-DDTHH:mm:ss
        publicationDate = {
          dateTime: scheduledDate,
          timezone: 'UTC', // ⚠️ MUST be UTC
        };
      } else if (existingPost?.publicationDate) {
        // ⚠️ CRITICAL: ALWAYS force timezone to UTC
        // Existing posts may have America/Chicago or other timezones stored in Metricool,
        // but we MUST override to UTC or the recreated post will fail silently
        publicationDate = {
          dateTime: existingPost.publicationDate.dateTime,
          timezone: 'UTC', // ⚠️ OVERRIDE to UTC, do NOT copy existing timezone
        };
      } else if (proposedPost.scheduled_date) {
        // Fallback to database scheduled date
        publicationDate = {
          dateTime: new Date(proposedPost.scheduled_date)
            .toISOString()
            .slice(0, 19),
          timezone: 'UTC', // ⚠️ MUST be UTC
        };
      } else {
        // Default to 1 hour from now
        const defaultDate = new Date(Date.now() + 60 * 60 * 1000);
        publicationDate = {
          dateTime: defaultDate.toISOString().slice(0, 19),
          timezone: 'UTC', // ⚠️ MUST be UTC
        };
      }

      // Build new post payload matching the working bulkDrafts format
      // ⚠️ CRITICAL: Extract ONLY the network field from providers
      // Including status field causes 400 "Deserialization error"
      // Empty network field causes 500 error
      const providersForCreate = existingPost?.providers
        ? existingPost.providers.map(p => ({ network: p.network }))
        : [{ network: proposedPost.platform }]; // ⚠️ Use proposedPost.platform, NOT .provider

      const newPostPayload = {
        autoPublish: false,
        draft:
          draft !== undefined
            ? draft
            : existingPost?.draft || proposedPost.draft || true,
        media:
          media !== undefined
            ? media
            : existingPost?.media ||
              proposedPost.media_urls?.map(m => m.url) ||
              [],
        providers: providersForCreate,
        publicationDate,
        text:
          text !== undefined
            ? text
            : existingPost?.text || proposedPost.text || '',
      };

      logger.info('Creating replacement Metricool post', {
        oldPostId: postId,
        scheduledDate: publicationDate.dateTime,
        stockNumber: campaign.stock_number,
        timezone: publicationDate.timezone,
      });

      // Step 3: Create the new post
      const metricoolResponse =
        await metricoolClient.createPost(newPostPayload);

      if (!metricoolResponse?.data?.id) {
        logger.error('Failed to create replacement Metricool post', {
          hasData: !!metricoolResponse?.data,
          oldPostId: postId,
          stockNumber: campaign.stock_number,
        });

        throw new ApiError(
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          'Failed to create replacement Metricool post',
          500
        );
      }

      const newPostId = metricoolResponse.data.id;

      logger.info('Successfully created replacement Metricool post', {
        newPostId,
        oldPostId: postId,
        stockNumber: campaign.stock_number,
      });

      // Step 4: Update our database with the new post ID and updated values
      const dbUpdate = {
        'proposed_posts.$.metricool_id': newPostId, // Update to new post ID
      };

      if (text !== undefined) {
        dbUpdate['proposed_posts.$.text'] = text;
      }
      if (scheduledDate !== undefined) {
        dbUpdate['proposed_posts.$.scheduled_date'] = new Date(scheduledDate);
      }
      if (draft !== undefined) {
        dbUpdate['proposed_posts.$.draft'] = draft;
      }

      // Update Metricool tracking info from new post response
      if (metricoolResponse?.data) {
        const metricoolData = metricoolResponse.data;

        // Update status from Metricool provider
        if (metricoolData.providers?.[0]?.status) {
          dbUpdate['proposed_posts.$.metricool_status'] =
            metricoolData.providers[0].status;
        }

        // Update scheduled date
        if (metricoolData.publicationDate?.dateTime) {
          dbUpdate['proposed_posts.$.metricool_scheduled_date'] = new Date(
            metricoolData.publicationDate.dateTime
          );
        }
      }

      // Update media URLs if provided
      if (media !== undefined) {
        dbUpdate['proposed_posts.$.media_urls'] = media.map(url => ({ url }));
      }

      // Apply database updates (always have at least the new metricool_id)
      const updateResult = await SocialCampaigns.updateOne(
        {
          'proposed_posts._id': proposedPost._id, // Find by unique post _id
          stock_number: campaign.stock_number,
        },
        { $set: dbUpdate }
      );

      if (updateResult.modifiedCount === 0) {
        logger.warn('Failed to update proposed post in database', {
          newPostId,
          oldPostId: postId,
          stockNumber: campaign.stock_number,
        });
      } else {
        logger.info('Updated proposed post in database with new Metricool ID', {
          newPostId,
          oldPostId: postId,
          stockNumber: campaign.stock_number,
          updatedFields: Object.keys(dbUpdate),
        });
      }
    } catch (metricoolError) {
      logger.error('Failed to update post in Metricool', {
        error: metricoolError.message,
        errorData: metricoolError.data || metricoolError.response?.data,
        errorDetails: metricoolError.details || null,
        originalError: metricoolError.originalError || null,
        postId,
        statusCode:
          metricoolError.statusCode || metricoolError.response?.status,
        stockNumber: campaign.stock_number,
      });

      const errorMsg = metricoolError.message
        ? `Metricool API error: ${metricoolError.message}`
        : `Metricool API returned status ${metricoolError.statusCode || metricoolError.response?.status || 'unknown'}`;

      const error = new ApiError(
        ERROR_CODES.EXTERNAL_API_ERROR,
        errorMsg,
        metricoolError.statusCode || metricoolError.response?.status || 500,
        {
          metricoolError: metricoolError.message,
          metricoolPostId: postId,
          stockNumber: campaign.stock_number,
        }
      );
      return res.status(error.statusCode).json({
        code: error.code,
        error: error.details || null,
        message: error.message,
      });
    }

    // Fetch and return the updated campaign
    const updatedCampaign = await SocialCampaigns.findOne({
      stock_number: campaign.stock_number,
    }).lean();

    logger.info('Metricool post updated successfully', {
      postId,
      stockNumber: campaign.stock_number,
    });

    // Return the entire updated campaign
    res.status(200).json({
      data: updatedCampaign,
      message: 'Post updated successfully in Metricool and campaign',
    });
  } catch (error) {
    logger.error('Error updating Metricool post', {
      error: error.message,
      postId: req.params.postId,
      stack: error.stack,
    });

    next(error);
  }
};
