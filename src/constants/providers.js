// Supported social media providers
export const PROVIDERS = {
  INSTAGRAM: 'instagram',
  LINKEDIN: 'linkedin',
  META: 'meta',
  REDDIT: 'reddit',
  THREADS: 'threads',
  TIKTOK_BUSINESS: 'tiktok_business',
  TIKTOK_PERSONAL: 'tiktok_personal',
  X: 'x',
  YOUTUBE: 'youtube',
};

export const PROVIDER_NAMES = {
  [PROVIDERS.INSTAGRAM]: 'Instagram',
  [PROVIDERS.LINKEDIN]: 'LinkedIn',
  [PROVIDERS.META]: 'Meta (Facebook/Instagram)',
  [PROVIDERS.REDDIT]: 'Reddit',
  [PROVIDERS.THREADS]: 'Threads',
  [PROVIDERS.TIKTOK_BUSINESS]: 'TikTok (Business)',
  [PROVIDERS.TIKTOK_PERSONAL]: 'TikTok (Personal)',
  [PROVIDERS.X]: 'X (Twitter)',
  [PROVIDERS.YOUTUBE]: 'YouTube',
};

export const SUPPORTED_PROVIDERS = Object.values(PROVIDERS);

// For Zod validation - array of provider values
export const SUPPORTED_PROVIDERS_ARRAY = Object.values(PROVIDERS);

// Provider capabilities
export const PROVIDER_CAPABILITIES = {
  [PROVIDERS.INSTAGRAM]: {
    canComment: true,
    canFetch: true,
    canPost: true,
    hasWebhooks: true,
    requiresPageToken: true,
    supportsMedia: true,
  },
  [PROVIDERS.LINKEDIN]: {
    canComment: false,
    canFetch: true,
    canPost: true,
    hasWebhooks: false,
    requiresPageToken: false,
    supportsMedia: true,
  },
  [PROVIDERS.META]: {
    canComment: true,
    canFetch: true,
    canPost: true,
    hasWebhooks: true,
    requiresPageToken: true,
    supportsMedia: true,
  },
  [PROVIDERS.REDDIT]: {
    canComment: true,
    canFetch: true,
    canPost: true,
    hasWebhooks: false,
    requiresPageToken: false,
    supportsMedia: false,
  },
  [PROVIDERS.THREADS]: {
    canComment: true,
    canFetch: true,
    canPost: true,
    hasWebhooks: true,
    requiresPageToken: false,
    supportsMedia: true,
  },
  [PROVIDERS.TIKTOK_BUSINESS]: {
    canComment: false,
    canFetch: true,
    canPost: true,
    hasWebhooks: false,
    requiresPageToken: false,
    supportsMedia: true,
  },
  [PROVIDERS.TIKTOK_PERSONAL]: {
    canComment: false,
    canFetch: true,
    canPost: true,
    hasWebhooks: false,
    requiresPageToken: false,
    supportsMedia: true,
  },
  [PROVIDERS.X]: {
    canComment: true,
    canFetch: true,
    canPost: true,
    hasWebhooks: true,
    requiresPageToken: false,
    supportsMedia: true,
  },
  [PROVIDERS.YOUTUBE]: {
    canComment: true,
    canFetch: true,
    canPost: true,
    hasWebhooks: false,
    requiresPageToken: false,
    supportsMedia: true,
  },
};
