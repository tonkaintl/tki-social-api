// Metricool API status values (from provider.status field in their API)
// Note: Metricool uses post.draft boolean (true/false) to distinguish drafts from scheduled
// The provider.status field shows the publishing status, not draft status
export const METRICOOL_STATUS = {
  ERROR: 'ERROR', // Post failed to publish
  PENDING: 'PENDING', // Post is scheduled/waiting to publish (or draft with schedule)
  PUBLISHED: 'PUBLISHED', // Post has been published
  PUBLISHING: 'PUBLISHING', // Post is currently being published
};

export const METRICOOL_STATUS_VALUES = Object.values(METRICOOL_STATUS);

// Business rules: Which Metricool statuses allow operations
export const METRICOOL_OPERATIONS = {
  // Posts with these statuses can be deleted from Metricool
  CAN_DELETE: [METRICOOL_STATUS.PENDING],
  // Posts with these statuses can be updated in Metricool
  CAN_UPDATE: [METRICOOL_STATUS.PENDING],
  // Posts with these statuses cannot be modified in Metricool
  IMMUTABLE: [
    METRICOOL_STATUS.PUBLISHED,
    METRICOOL_STATUS.ERROR,
    METRICOOL_STATUS.PUBLISHING,
  ],
};

// Media storage constants
export const MEDIA_STORAGE = {
  AZURE: 'azure',
};

export const MEDIA_STORAGE_VALUES = Object.values(MEDIA_STORAGE);

// Media type constants
export const MEDIA_TYPE = {
  IMAGE: 'image',
  PDF: 'pdf',
  VIDEO: 'video',
};

export const MEDIA_TYPE_VALUES = Object.values(MEDIA_TYPE);

// Default values
export const CAMPAIGN_DEFAULTS = {
  MEDIA_STORAGE: MEDIA_STORAGE.AZURE,
};

// Schema field names (for consistent referencing)
export const CAMPAIGN_FIELDS = {
  CREATED_AT: 'created_at',
  CREATED_BY: 'created_by',
  DESCRIPTION: 'description',
  MEDIA_STORAGE: 'media_storage',
  MEDIA_URLS: 'media_urls', // Media Portfolio array
  SHORT_URL: 'short_url',
  STATUS: 'status',
  STOCK_NUMBER: 'stock_number',
  TITLE: 'title',
  UPDATED_AT: 'updated_at',
  URL: 'url',
};

// Media object field names
export const MEDIA_FIELDS = {
  AZURE_BLOB_URL: 'azure_blob_url',
  URL: 'url',
};
