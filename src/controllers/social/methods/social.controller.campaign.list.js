/**
 * Social Campaign List Controller
 * Lists campaigns with pagination, sorting, and filtering
 */

import { z } from 'zod';

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// ----------------------------------------------------------------------------
// Validation Schemas
// ----------------------------------------------------------------------------

const getCampaignsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .default('25')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  page: z
    .string()
    .optional()
    .default('1')
    .transform(val => parseInt(val, 10))
    .refine(val => val > 0, 'Page must be greater than 0'),
  sortBy: z
    .enum([
      'created_at',
      'updated_at',
      'createdAt',
      'updatedAt',
      'stock_number',
      'stockNumber',
      'status',
    ])
    .optional()
    .default('updatedAt')
    .transform(val => {
      // Convert camelCase to snake_case for database queries
      const fieldMap = {
        createdAt: 'created_at',
        stockNumber: 'stock_number',
        updatedAt: 'updated_at',
      };
      return fieldMap[val] || val;
    }),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: z.enum(['draft', 'queued', 'posting', 'posted', 'failed']).optional(),
});

// ----------------------------------------------------------------------------
// Controllers
// ----------------------------------------------------------------------------

/**
 * Get Campaigns List with Pagination
 * GET /social/campaigns
 */
export const getCampaignsList = async (req, res) => {
  try {
    // Validate query parameters
    const validation = getCampaignsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      logger.warn('Invalid campaign list request', {
        errors: validation.error.errors,
        query: req.query,
        requestId: req.requestId,
      });
      const error = new ApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        400,
        validation.error.errors
      );
      return res.status(error.statusCode).json({
        code: error.code,
        details: error.details,
        error: error.message,
      });
    }

    const { limit, page, sortBy, sortOrder, status } = validation.data;

    logger.info('Fetching campaigns list', {
      limit,
      page,
      requestId: req.requestId,
      sortBy,
      sortOrder,
      status,
    });

    // Build query filter
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute queries in parallel
    const [campaigns, totalCount] = await Promise.all([
      SocialCampaigns.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select({
          campaign_id: 1,
          created_at: 1,
          'inventory_data.make': 1,
          'inventory_data.model': 1,
          'inventory_data.year': 1,
          posts: 1,
          status: 1,
          stock_number: 1,
          updated_at: 1,
        })
        .lean(),
      SocialCampaigns.countDocuments(filter),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Format campaigns with post statistics
    const formattedCampaigns = campaigns.map(campaign => ({
      campaign_id: campaign.campaign_id,
      created_at: campaign.created_at,
      inventory_data: {
        make: campaign.inventory_data?.make || null,
        model: campaign.inventory_data?.model || null,
        year: campaign.inventory_data?.year || null,
      },
      metadata: {
        failed_count:
          campaign.posts?.filter(p => p.status === 'failed').length || 0,
        posted_count:
          campaign.posts?.filter(p => p.status === 'posted').length || 0,
        total_posts: campaign.posts?.length || 0,
      },
      status: campaign.status,
      stock_number: campaign.stock_number,
      updated_at: campaign.updated_at,
    }));

    const response = {
      campaigns: formattedCampaigns,
      pagination: {
        currentPage: page,
        hasNextPage,
        hasPrevPage,
        limit,
        totalCount,
        totalPages,
      },
    };

    logger.info('Campaigns list retrieved successfully', {
      count: formattedCampaigns.length,
      page,
      requestId: req.requestId,
      totalCount,
    });

    res.json(response);
  } catch (error) {
    logger.error('Error fetching campaigns list', {
      error: error.message,
      requestId: req.requestId,
      stack: error.stack,
    });

    const apiError = new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      'Internal server error'
    );
    res.status(apiError.statusCode).json({
      code: apiError.code,
      error: apiError.message,
      message: 'Failed to fetch campaigns list',
    });
  }
};
