// ----------------------------------------------------------------------------
// GET /social/fetch
// Fetch social media campaigns with pagination and filtering
// ----------------------------------------------------------------------------

import { z } from 'zod';

import { ApiError, ERROR_CODES } from '../../../constants/errors.js';
import SocialCampaigns from '../../../models/socialCampaigns.model.js';
import { logger } from '../../../utils/logger.js';

// Query validation schema
const fetchCampaignsSchema = z.object({
  createdBy: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  page: z.coerce.number().int().min(1).default(1),
  sortBy: z
    .enum(['created_at', 'updated_at', 'stock_number', 'title'])
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z
    .enum(['pending', 'draft', 'scheduled', 'published', 'failed'])
    .optional(),
  stockNumber: z.string().optional(),
});

/**
 * Fetch social media campaigns with pagination and filtering
 * GET /social/fetch
 */
export const fetchSocialPosts = async (req, res, next) => {
  try {
    // Validate query parameters
    const validationResult = fetchCampaignsSchema.safeParse(req.query);

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

    const { createdBy, limit, page, sortBy, sortOrder, status, stockNumber } =
      validationResult.data;

    logger.info('Fetching social campaigns', {
      createdBy,
      limit,
      page,
      requestId: req.id,
      sortBy,
      sortOrder,
      status,
      stockNumber,
    });

    // Build query filter
    const filter = {};
    if (status) filter.status = status;
    if (stockNumber)
      filter.stock_number = { $options: 'i', $regex: stockNumber };
    if (createdBy) filter.created_by = createdBy;

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [campaigns, totalCount] = await Promise.all([
      SocialCampaigns.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      SocialCampaigns.countDocuments(filter),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    logger.info('Campaigns fetched successfully', {
      count: campaigns.length,
      page,
      requestId: req.id,
      totalCount,
      totalPages,
    });

    return res.json({
      campaigns,
      pagination: {
        currentPage: page,
        hasNextPage,
        hasPrevPage,
        limit,
        totalCount,
        totalPages,
      },
      requestId: req.id,
      success: true,
    });
  } catch (error) {
    logger.error('Failed to fetch campaigns', {
      error: error.message,
      requestId: req.id,
    });

    next(error);
  }
};
