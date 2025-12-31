// Tier classification values for RSS feeds
export const FEED_TIER = {
  ARCHIVED: 'archived',
  CORE: 'core',
  OUTLIER: 'outlier',
  REJECTED: 'rejected',
};

export const FEED_TIER_VALUES = Object.values(FEED_TIER);

// Valid sort fields for feed listing
export const FEED_SORT_FIELD = {
  CREATED_AT: 'created_at',
  CREATED_AT_DESC: '-created_at',
  DINNER_SCORE: 'dinner_score',
  DINNER_SCORE_DESC: '-dinner_score',
  NAME: 'name',
  NAME_DESC: '-name',
  UPDATED_AT: 'updated_at',
  UPDATED_AT_DESC: '-updated_at',
};

export const FEED_SORT_FIELD_VALUES = Object.values(FEED_SORT_FIELD);

// Allowed fields for PATCH updates
export const FEED_UPDATE_FIELDS = {
  CATEGORY: 'category',
  DINNER_SCORE: 'dinner_score',
  ENABLED: 'enabled',
  FEEDSPOT_FEED_ID: 'feedspot_feed_id',
  FEEDSPOT_FOLDER_ID: 'feedspot_folder_id',
  NAME: 'name',
  NOTES: 'notes',
  REJECTED_REASON: 'rejected_reason',
  RSS_URL: 'rss_url',
  TIER: 'tier',
};

export const FEED_UPDATE_FIELDS_VALUES = Object.values(FEED_UPDATE_FIELDS);

// Schema field names (for consistent referencing)
export const FEED_FIELDS = {
  CATEGORY: 'category',
  CREATED_AT: 'created_at',
  DINNER_SCORE: 'dinner_score',
  ENABLED: 'enabled',
  FEEDSPOT_FEED_ID: 'feedspot_feed_id',
  FEEDSPOT_FOLDER_ID: 'feedspot_folder_id',
  ID: '_id',
  NAME: 'name',
  NOTES: 'notes',
  REJECTED_REASON: 'rejected_reason',
  RSS_URL: 'rss_url',
  TIER: 'tier',
  UPDATED_AT: 'updated_at',
};

// Error codes
export const FEED_ERROR_CODE = {
  DUPLICATE_RSS_URL: 'DUPLICATE_RSS_URL',
  FEED_LIST_FAILED: 'FEED_LIST_FAILED',
  FEED_NOT_FOUND: 'FEED_NOT_FOUND',
  FEED_UPDATE_FAILED: 'FEED_UPDATE_FAILED',
  FEED_UPSERT_FAILED: 'FEED_UPSERT_FAILED',
  INVALID_DINNER_SCORE: 'INVALID_DINNER_SCORE',
  INVALID_FEED_ID: 'INVALID_FEED_ID',
  INVALID_PAGE: 'INVALID_PAGE',
  INVALID_SORT_FIELD: 'INVALID_SORT_FIELD',
  INVALID_TIER: 'INVALID_TIER',
  MISSING_RSS_URL: 'MISSING_RSS_URL',
  NO_UPDATE_FIELDS: 'NO_UPDATE_FIELDS',
  NOT_REQUIRED_FOR_REJECTED: 'NOTES_REQUIRED_FOR_REJECTED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
};

// Validation constants
export const FEED_VALIDATION = {
  DINNER_SCORE_MAX: 100,
  DINNER_SCORE_MIN: 0,
};

// Pagination constants
export const FEED_PAGINATION = {
  DEFAULT_LIMIT: 25,
  DEFAULT_PAGE: 1,
  MAX_LIMIT: 100,
};

// Search fields (for full-text search)
export const FEED_SEARCH_FIELDS = [
  FEED_FIELDS.NAME,
  FEED_FIELDS.RSS_URL,
  FEED_FIELDS.CATEGORY,
  FEED_FIELDS.TIER,
  FEED_FIELDS.NOTES,
];

// Default values
export const FEED_DEFAULTS = {
  DINNER_SCORE: 50,
  ENABLED: true,
  TIER: FEED_TIER.OUTLIER,
};
