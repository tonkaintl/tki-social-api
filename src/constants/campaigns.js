// Campaign status constants
export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  FAILED: 'failed',
  PENDING: 'pending',
  PUBLISHED: 'published',
  SCHEDULED: 'scheduled',
};

export const CAMPAIGN_STATUS_VALUES = Object.values(CAMPAIGN_STATUS);

// Post internal status constants
export const POST_INTERNAL_STATUS = {
  CREATED: 'created',
  DRAFTED: 'drafted',
  FAILED: 'failed',
  MANUAL_PUSH: 'manual_push',
  PUBLISHED: 'published',
  SCHEDULED: 'scheduled',
};

export const POST_INTERNAL_STATUS_VALUES = Object.values(POST_INTERNAL_STATUS);

// Metricool status constants
export const METRICOOL_STATUS = {
  DRAFT: 'draft',
  FAILED: 'failed',
  PUBLISHED: 'published',
  SCHEDULED: 'scheduled',
};

export const METRICOOL_STATUS_VALUES = Object.values(METRICOOL_STATUS);

// Media storage constants
export const MEDIA_STORAGE = {
  AZURE: 'azure',
};

export const MEDIA_STORAGE_VALUES = Object.values(MEDIA_STORAGE);

// Platform content keys
export const PLATFORM_CONTENT_KEYS = {
  FACEBOOK_PAGE: 'facebook_page',
  INSTAGRAM_BUSINESS: 'instagram_business',
  LINKEDIN_COMPANY: 'linkedin_company',
  X_PROFILE: 'x_profile',
};

export const PLATFORM_CONTENT_KEYS_VALUES = Object.values(
  PLATFORM_CONTENT_KEYS
);

// Default values
export const CAMPAIGN_DEFAULTS = {
  MEDIA_STORAGE: MEDIA_STORAGE.AZURE,
  POST_INTERNAL_STATUS: POST_INTERNAL_STATUS.CREATED,
  STATUS: CAMPAIGN_STATUS.PENDING,
};

// Schema field names (for consistent referencing)
export const CAMPAIGN_FIELDS = {
  CREATED_AT: 'created_at',
  CREATED_BY: 'created_by',
  DESCRIPTION: 'description',
  MEDIA_STORAGE: 'media_storage',
  MEDIA_URLS: 'media_urls',
  PLATFORM_CONTENT: 'platform_content',
  POSTS: 'posts',
  SHORT_URL: 'short_url',
  STATUS: 'status',
  STOCK_NUMBER: 'stock_number',
  TITLE: 'title',
  UPDATED_AT: 'updated_at',
  URL: 'url',
};

// Post schema field names
export const POST_FIELDS = {
  ERROR: 'error',
  EXTERNAL_ID: 'external_id',
  INTERNAL_STATUS: 'internal_status',
  LAST_STATUS_CHECK: 'last_status_check',
  METRICOOL_ID: 'metricool_id',
  METRICOOL_STATUS: 'metricool_status',
  PLATFORM: 'platform',
  PUBLISHED_DATE: 'published_date',
  SCHEDULED_DATE: 'scheduled_date',
};

// Platform content field names
export const PLATFORM_CONTENT_FIELDS = {
  CAPTION: 'caption',
  CHARACTER_COUNT: 'character_count',
  HASHTAGS: 'hashtags',
  HTML_PREVIEW: 'html_preview',
  MEDIA: 'media',
  SHARE_URL: 'share_url',
  UTM: 'utm',
};

// Media object field names
export const MEDIA_FIELDS = {
  AZURE_BLOB_URL: 'azure_blob_url',
  URL: 'url',
};
