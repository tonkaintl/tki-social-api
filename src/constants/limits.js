// Rate limiting constants
export const RATE_LIMITS = {
  DEFAULT_MAX_REQUESTS: 100,
  // General API limits
  DEFAULT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes

  POST_MAX_REQUESTS: 20,
  // Post-specific limits
  POST_WINDOW_MS: 60 * 60 * 1000, // 1 hour

  // Provider-specific limits (requests per hour)
  PROVIDER_LIMITS: {
    linkedin: 100,
    meta: 200,
    reddit: 60,
    x: 300,
  },
  WEBHOOK_MAX_REQUESTS: 1000,

  // Webhook limits
  WEBHOOK_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
};

// Cache and storage limits
export const CACHE_LIMITS = {
  // Idempotency store TTL
  IDEMPOTENCY_TTL_MS: 5 * 60 * 1000, // 5 minutes

  // Maximum cache entries
  MAX_CACHE_ENTRIES: 10000,

  // Token cache TTL
  TOKEN_CACHE_TTL_MS: 50 * 60 * 1000, // 50 minutes (tokens usually last 1 hour)
};

// Request size limits
export const REQUEST_LIMITS = {
  // Maximum JSON payload size
  MAX_JSON_SIZE: '10mb',

  // Maximum number of media URLs per post
  MAX_MEDIA_URLS: 10,

  // Maximum message length (will be validated per provider)
  MAX_MESSAGE_LENGTH: 4000,

  // Maximum number of providers in multi-provider requests
  MAX_PROVIDERS: 4,

  // Maximum URL-encoded payload size
  MAX_URLENCODED_SIZE: '10mb',
};
