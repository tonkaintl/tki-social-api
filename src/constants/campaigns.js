// Campaign status constants
export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  FAILED: 'failed',
  PENDING: 'pending',
  PUBLISHED: 'published',
  SCHEDULED: 'scheduled',
};

export const CAMPAIGN_STATUS_VALUES = Object.values(CAMPAIGN_STATUS);

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
  STATUS: CAMPAIGN_STATUS.PENDING,
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
