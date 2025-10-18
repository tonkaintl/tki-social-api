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
  limit: z.coerce.number().int().min(1).max(100).default(25),
  page: z.coerce.number().int().min(1).default(1),
  search: z.string().optional(), // Multi-field search for stock number, title, description
  sortBy: z
    .enum(['created_at', 'updated_at', 'stock_number', 'title', 'status'])
    .default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z
    .enum(['pending', 'draft', 'scheduled', 'published', 'failed'])
    .optional(),
  // Keep legacy stockNumber parameter for backward compatibility
  stockNumber: z.string().optional(),
});

/**
 * Fetch social media campaigns with pagination and filtering
 * GET /social/fetch
 */
export const fetchCampaigns = async (req, res, next) => {
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

    const {
      createdBy,
      limit,
      page,
      search,
      sortBy,
      sortOrder,
      status,
      stockNumber,
    } = validationResult.data;

    logger.info('Fetching social campaigns', {
      createdBy,
      limit,
      page,
      requestId: req.id,
      search,
      sortBy,
      sortOrder,
      status,
      stockNumber,
    });

    // Build query filter
    const filter = {};

    // Status filter
    if (status) filter.status = status;

    // Created by filter
    if (createdBy) filter.created_by = createdBy;

    // Enhanced search - supports both new 'search' and legacy 'stockNumber' parameters
    if (search) {
      // Multi-field search across stock number, title, and description
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { stock_number: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
      ];
    } else if (stockNumber) {
      // Legacy single field search for backward compatibility
      filter.stock_number = { $options: 'i', $regex: stockNumber };
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [campaigns, totalCount] = await Promise.all([
      SocialCampaigns.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select({
          created_at: 1,
          created_by: 1,
          description: 1, // Include for search and response
          status: 1,
          stock_number: 1,
          title: 1, // Include for search and response
          updated_at: 1,
        })
        .lean(),
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
