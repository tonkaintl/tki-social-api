// Supported social media providers
export const PROVIDERS = {
  LINKEDIN: 'linkedin',
  META: 'meta',
  REDDIT: 'reddit',
  X: 'x',
};

export const PROVIDER_NAMES = {
  [PROVIDERS.LINKEDIN]: 'LinkedIn',
  [PROVIDERS.META]: 'Meta (Facebook/Instagram)',
  [PROVIDERS.REDDIT]: 'Reddit',
  [PROVIDERS.X]: 'X (Twitter)',
};

export const SUPPORTED_PROVIDERS = Object.values(PROVIDERS);

// Provider capabilities
export const PROVIDER_CAPABILITIES = {
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
  [PROVIDERS.X]: {
    canComment: true,
    canFetch: true,
    canPost: true,
    hasWebhooks: true,
    requiresPageToken: false,
    supportsMedia: true,
  },
};
