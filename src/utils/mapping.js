// Utility functions for data transformation and mapping

/**
 * Deep merge two objects
 */
export function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Remove undefined/null values from object
 */
export function cleanObject(obj) {
  const cleaned = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedValue = cleanObject(value);
        if (Object.keys(cleanedValue).length > 0) {
          cleaned[key] = cleanedValue;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }

  return cleaned;
}

/**
 * Extract UTM parameters and append to URL
 */
export function appendUtmToUrl(url, utmParams) {
  if (!url || !utmParams || Object.keys(utmParams).length === 0) {
    return url;
  }

  try {
    const urlObj = new URL(url);

    for (const [key, value] of Object.entries(utmParams)) {
      if (value) {
        urlObj.searchParams.set(key, value);
      }
    }

    return urlObj.toString();
  } catch {
    // Invalid URL, return as-is
    return url;
  }
}

/**
 * Normalize social media handle (remove @ prefix if present)
 */
export function normalizeHandle(handle) {
  if (!handle) return handle;
  return handle.startsWith('@') ? handle.substring(1) : handle;
}

/**
 * Format error for consistent API responses
 */
export function formatError(error, provider = null) {
  return {
    code: error.code || 'UNKNOWN_ERROR',
    details: error.details || null,
    message: error.message || 'An unexpected error occurred',
    provider,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Sleep utility for delays/backoff
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random jitter for exponential backoff
 */
export function jitter(baseMs, maxJitterMs = 1000) {
  return baseMs + Math.random() * maxJitterMs;
}
