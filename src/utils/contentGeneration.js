/**
 * Campaign Content Generation Utilities
 * Shared logic for generating formatted content for social platforms
 */

import { BinderAdapter } from '../adapters/binder/binder.adapter.js';
import { formatBinderItemForLinkedIn } from '../adapters/linkedin/formatters/binder-item.formatter.js';
import { formatBinderItemForMeta } from '../adapters/meta/formatters/binder-item.formatter.js';
import { formatBinderItemForReddit } from '../adapters/reddit/formatters/binder-item.formatter.js';
import { formatBinderItemForX } from '../adapters/x/formatters/binder-item.formatter.js';
import { config } from '../config/env.js';

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

export const SUPPORTED_PROVIDERS = ['meta', 'linkedin', 'x', 'reddit'];

export const formatters = {
  linkedin: formatBinderItemForLinkedIn,
  meta: formatBinderItemForMeta,
  reddit: formatBinderItemForReddit,
  x: formatBinderItemForX,
};

// ----------------------------------------------------------------------------
// Utility Functions
// ----------------------------------------------------------------------------

/**
 * Generate formatted content for a single platform
 * @param {string} stockNumber - The stock number to fetch from Binder
 * @param {string} platform - The platform to format for
 * @param {string} baseMessage - Optional base message to use instead of item title
 * @returns {Promise<{item: Object, formattedContent: Object}>}
 */
export const generatePlatformContent = async (
  stockNumber,
  platform,
  baseMessage = ''
) => {
  // Fetch item from Binder
  const binderAdapter = new BinderAdapter(config);
  const item = await binderAdapter.getItem(stockNumber);

  // Use base message if provided, otherwise use item title
  const messageToUse = baseMessage || item.title;

  // Format for the requested platform
  const formatter = formatters[platform];
  if (!formatter) {
    throw new Error(`No formatter found for platform: ${platform}`);
  }

  const formattedContent = formatter(item, messageToUse);

  return { formattedContent, item };
};

/**
 * Generate formatted content for multiple platforms
 * @param {string} stockNumber - The stock number to fetch from Binder
 * @param {string[]} platforms - Array of platforms to format for
 * @param {string} baseMessage - Optional base message to use instead of item title
 * @returns {Promise<{item: Object, platformContent: Object}>}
 */
export const generateMultiPlatformContent = async (
  stockNumber,
  platforms,
  baseMessage = ''
) => {
  // Fetch item from Binder once
  const binderAdapter = new BinderAdapter(config);
  const item = await binderAdapter.getItem(stockNumber);

  // Use base message if provided, otherwise use item title
  const messageToUse = baseMessage || item.title;

  // Generate content for each platform
  const platformContent = {};

  for (const platform of platforms) {
    const formatter = formatters[platform];
    if (formatter) {
      platformContent[platform] = formatter(item, messageToUse);
    }
  }

  return { item, platformContent };
};
