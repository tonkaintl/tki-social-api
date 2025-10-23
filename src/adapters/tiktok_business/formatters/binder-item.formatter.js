/**
 * Format a Binder inventory item for TikTok Business posting
 * Optimized for TikTok Business's short-form video format
 */
export function formatBinderItemForTikTokBusiness(item, baseMessage = '') {
  const lines = [];

  // Use baseMessage if provided, otherwise construct from item data
  if (baseMessage) {
    lines.push(baseMessage);
  } else {
    // Fallback to constructing from item data
    if (item.year && item.make && item.model) {
      lines.push(`${item.year} ${item.make} ${item.model} 🚗`);
    } else if (item.make && item.model) {
      lines.push(`${item.make} ${item.model} 🚗`);
    }
  }

  // Key details (keep it short for TikTok)
  if (item.price) {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      currency: 'USD',
      style: 'currency',
    }).format(item.price);
    lines.push(`💰 ${formattedPrice}`);
  }

  if (item.location) {
    lines.push(`📍 ${item.location}`);
  }

  // Call to action
  lines.push('');
  lines.push('Link in bio! 🔗');

  // Hashtags (critical for TikTok discovery)
  lines.push('');
  lines.push(
    '#business #cars #automotive #forsale #carsoftiktok #cardealership'
  );

  return lines.join('\n');
}
