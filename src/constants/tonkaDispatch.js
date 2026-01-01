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

// ----------------------------------------------------------------------------
// RANKINGS WEBHOOK CONSTANTS
// ----------------------------------------------------------------------------

// Rankings error codes
export const RANKINGS_ERROR_CODE = {
  INVALID_PAGE: 'INVALID_PAGE',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  INVALID_SORT_FIELD: 'INVALID_SORT_FIELD',
  MISSING_GENERATED_AT: 'MISSING_GENERATED_AT',
  MISSING_RANKINGS: 'MISSING_RANKINGS',
  MISSING_SELECTED_IDS: 'MISSING_SELECTED_IDS',
  MISSING_SUBJECT: 'MISSING_SUBJECT',
  RANKINGS_LIST_FAILED: 'RANKINGS_LIST_FAILED',
  RANKINGS_SAVE_FAILED: 'RANKINGS_SAVE_FAILED',
};

// Rankings field names
export const RANKINGS_FIELDS = {
  ARTICLE: 'article',
  CANONICAL_ID: 'canonical_id',
  CREATED_AT: 'created_at',
  EMAIL_SENT_AT: 'email_sent_at',
  GENERATED_AT_ISO: 'generated_at_iso',
  ID: '_id',
  NOTIFIER_EMAIL: 'notifier_email',
  RANK: 'rank',
  RANKINGS: 'rankings',
  REASON: 'reason',
  SCORE: 'score',
  SELECTED_CANONICAL_IDS: 'selected_canonical_ids',
  SUBJECT: 'subject',
  UPDATED_AT: 'updated_at',
};

// Article field names
export const ARTICLE_FIELDS = {
  ARTICLE_HOST: 'article_host',
  ARTICLE_ROOT_DOMAIN: 'article_root_domain',
  CANONICAL_ID: 'canonical_id',
  CATEGORY: 'category',
  CREATOR: 'creator',
  LINK: 'link',
  PUB_DATE_MS: 'pub_date_ms',
  SNIPPET: 'snippet',
  SOURCE_NAME: 'source_name',
  TITLE: 'title',
};

// Rankings schema field names
export const RANKING_FIELDS = {
  ARTICLE_HOST: 'article_host',
  ARTICLE_ROOT_DOMAIN: 'article_root_domain',
  BATCH_ID: 'batch_id',
  CANONICAL_ID: 'canonical_id',
  CATEGORY: 'category',
  CREATED_AT: 'created_at',
  CREATOR: 'creator',
  FEED_MATCH_REASON: 'feed_match_reason',
  FEED_MATCH_STATUS: 'feed_match_status',
  LINK: 'link',
  MATCH_METHOD: 'match_method',
  PUB_DATE_MS: 'pub_date_ms',
  RANK: 'rank',
  SNIPPET: 'snippet',
  SOURCE_NAME: 'source_name',
  TITLE: 'title',
  TONKA_DISPATCH_RSS_LINKS_ID: 'tonka_dispatch_rss_links_id',
};

// Valid sort fields for rankings listing
export const RANKING_SORT_FIELD = {
  CREATED_AT: 'created_at',
  CREATED_AT_DESC: '-created_at',
  RANK: 'rank',
  RANK_DESC: '-rank',
};

export const RANKING_SORT_FIELD_VALUES = Object.values(RANKING_SORT_FIELD);

// Pagination constants for rankings
export const RANKING_PAGINATION = {
  DEFAULT_LIMIT: 25,
  DEFAULT_PAGE: 1,
  MAX_LIMIT: 100,
};

// Feed match status values
export const FEED_MATCH_STATUS = {
  MATCHED: 'matched',
  NO_MATCH: 'no_match',
  UNKNOWN: 'unknown',
};

export const FEED_MATCH_STATUS_VALUES = Object.values(FEED_MATCH_STATUS);

// ----------------------------------------------------------------------------
// NEWSLETTER CONSTANTS
// ----------------------------------------------------------------------------

// Newsletter status values
export const NEWSLETTER_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  SENT: 'sent',
};

export const NEWSLETTER_STATUS_VALUES = Object.values(NEWSLETTER_STATUS);

// Newsletter error codes
export const NEWSLETTER_ERROR_CODE = {
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
  DUPLICATE_ARTICLE: 'DUPLICATE_ARTICLE',
  INVALID_ARTICLE_ORDER: 'INVALID_ARTICLE_ORDER',
  INVALID_PAGE: 'INVALID_PAGE',
  INVALID_SORT_FIELD: 'INVALID_SORT_FIELD',
  INVALID_STATUS: 'INVALID_STATUS',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  NEWSLETTER_CREATE_FAILED: 'NEWSLETTER_CREATE_FAILED',
  NEWSLETTER_DELETE_FAILED: 'NEWSLETTER_DELETE_FAILED',
  NEWSLETTER_LIST_FAILED: 'NEWSLETTER_LIST_FAILED',
  NEWSLETTER_NOT_FOUND: 'NEWSLETTER_NOT_FOUND',
  NEWSLETTER_UPDATE_FAILED: 'NEWSLETTER_UPDATE_FAILED',
  RANKING_NOT_FOUND: 'RANKING_NOT_FOUND',
};

// Newsletter field names
export const NEWSLETTER_FIELDS = {
  ARTICLES: 'articles',
  CREATED_AT: 'created_at',
  HERO_IMAGE_URL: 'hero_image_url',
  ID: '_id',
  SCHEDULED_DATE: 'scheduled_date',
  SENT_DATE: 'sent_date',
  SOURCE_BATCH_ID: 'source_batch_id',
  STATUS: 'status',
  TESTING_EMAILS: 'testing_emails',
  TITLE: 'title',
  UPDATED_AT: 'updated_at',
};

// Article subdocument field names
export const NEWSLETTER_ARTICLE_FIELDS = {
  ADDED_AT: 'added_at',
  CUSTOM_CATEGORY: 'custom_category',
  CUSTOM_IMAGE_URL: 'custom_image_url',
  CUSTOM_LINK: 'custom_link',
  CUSTOM_ORDER: 'custom_order',
  CUSTOM_SNIPPET: 'custom_snippet',
  CUSTOM_SOURCE_NAME: 'custom_source_name',
  CUSTOM_TITLE: 'custom_title',
  ID: '_id',
  IS_MANUAL_SECTION: 'is_manual_section',
  TONKA_DISPATCH_RANKINGS_ID: 'tonka_dispatch_rankings_id',
  UPDATED_AT: 'updated_at',
};

// Valid sort fields for newsletter listing
export const NEWSLETTER_SORT_FIELD = {
  CREATED_AT: 'created_at',
  CREATED_AT_DESC: '-created_at',
  SCHEDULED_DATE: 'scheduled_date',
  SCHEDULED_DATE_DESC: '-scheduled_date',
  SENT_DATE: 'sent_date',
  SENT_DATE_DESC: '-sent_date',
  TITLE: 'title',
  TITLE_DESC: '-title',
  UPDATED_AT: 'updated_at',
  UPDATED_AT_DESC: '-updated_at',
};

export const NEWSLETTER_SORT_FIELD_VALUES = Object.values(
  NEWSLETTER_SORT_FIELD
);

// Pagination constants for newsletters
export const NEWSLETTER_PAGINATION = {
  DEFAULT_LIMIT: 25,
  DEFAULT_PAGE: 1,
  MAX_LIMIT: 100,
};

// Allowed fields for newsletter PATCH updates
export const NEWSLETTER_UPDATE_FIELDS = {
  HERO_IMAGE_URL: 'hero_image_url',
  SCHEDULED_DATE: 'scheduled_date',
  STATUS: 'status',
  TESTING_EMAILS: 'testing_emails',
  TITLE: 'title',
};

export const NEWSLETTER_UPDATE_FIELDS_VALUES = Object.values(
  NEWSLETTER_UPDATE_FIELDS
);

// Allowed fields for article updates
export const ARTICLE_UPDATE_FIELDS = {
  CUSTOM_CATEGORY: 'custom_category',
  CUSTOM_IMAGE_URL: 'custom_image_url',
  CUSTOM_LINK: 'custom_link',
  CUSTOM_SNIPPET: 'custom_snippet',
  CUSTOM_SOURCE_NAME: 'custom_source_name',
  CUSTOM_TITLE: 'custom_title',
};

export const ARTICLE_UPDATE_FIELDS_VALUES = Object.values(
  ARTICLE_UPDATE_FIELDS
);
