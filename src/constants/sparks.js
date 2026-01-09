// Group classification values
export const SPARK_GROUP = {
  BUYERS_TRANSPARENCY: 'buyers_transparency',
  INDUSTRY_CULTURE: 'industry_culture',
  SELLING_VENDORS: 'selling_vendors',
};

export const SPARK_GROUP_VALUES = Object.values(SPARK_GROUP);

// Error codes
export const SPARK_ERROR_CODE = {
  DUPLICATE_SECTION: 'DUPLICATE_SECTION',
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  INVALID_GROUP: 'INVALID_GROUP',
  INVALID_PAGE: 'INVALID_PAGE',
  INVALID_SORT_FIELD: 'INVALID_SORT_FIELD',
  INVALID_SPARK_ID: 'INVALID_SPARK_ID',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  NO_UPDATE_FIELDS: 'NO_UPDATE_FIELDS',
  SPARK_LIST_FAILED: 'SPARK_LIST_FAILED',
  SPARK_NOT_FOUND: 'SPARK_NOT_FOUND',
  SPARK_UPDATE_FAILED: 'SPARK_UPDATE_FAILED',
  SPARK_UPSERT_FAILED: 'SPARK_UPSERT_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
};

// Schema field names (for consistent referencing)
export const SPARK_FIELDS = {
  CATEGORIES: 'categories',
  CONCEPT: 'concept',
  CREATED_AT: 'created_at',
  GROUP: 'group',
  ID: '_id',
  LAST_USED: 'last_used',
  RELEASE_ORDER: 'release_order',
  SECTION: 'section',
  THESIS: 'thesis',
  TIMES_USED: 'times_used',
  UPDATED_AT: 'updated_at',
};

// Allowed fields for PATCH updates
export const SPARK_UPDATE_FIELDS = {
  CATEGORIES: 'categories',
  CONCEPT: 'concept',
  GROUP: 'group',
  LAST_USED: 'last_used',
  RELEASE_ORDER: 'release_order',
  SECTION: 'section',
  THESIS: 'thesis',
  TIMES_USED: 'times_used',
};

export const SPARK_UPDATE_FIELDS_VALUES = Object.values(SPARK_UPDATE_FIELDS);

// Valid sort fields for spark listing
export const SPARK_SORT_FIELD = {
  CREATED_AT: 'created_at',
  CREATED_AT_DESC: '-created_at',
  GROUP: 'group',
  GROUP_DESC: '-group',
  LAST_USED: 'last_used',
  LAST_USED_DESC: '-last_used',
  RELEASE_ORDER: 'release_order',
  RELEASE_ORDER_DESC: '-release_order',
  SECTION: 'section',
  SECTION_DESC: '-section',
  TIMES_USED: 'times_used',
  TIMES_USED_DESC: '-times_used',
  UPDATED_AT: 'updated_at',
  UPDATED_AT_DESC: '-updated_at',
};

export const SPARK_SORT_FIELD_VALUES = Object.values(SPARK_SORT_FIELD);

// Pagination constants
export const SPARK_PAGINATION = {
  DEFAULT_LIMIT: 25,
  DEFAULT_PAGE: 1,
  MAX_LIMIT: 100,
};

// Search fields (for full-text search)
export const SPARK_SEARCH_FIELDS = [
  SPARK_FIELDS.SECTION,
  SPARK_FIELDS.CONCEPT,
  SPARK_FIELDS.THESIS,
  SPARK_FIELDS.GROUP,
];

// Default values
export const SPARK_DEFAULTS = {
  RELEASE_ORDER: 0,
  TIMES_USED: 0,
};
