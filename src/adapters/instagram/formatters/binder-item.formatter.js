/**
 * Format a Binder inventory item for Instagram posting
 * Optimized for Instagram's format with hashtags and emojis
 */
export function formatBinderItemForInstagram(item, baseMessage = '') {
  const lines = [];

  // Use baseMessage if provided, otherwise construct from item data
  if (baseMessage) {
    lines.push(baseMessage);
  } else {
    // Fallback to constructing from item data
    if (item.year && item.make && item.model) {
      lines.push(`🚗 ${item.year} ${item.make} ${item.model}`);
    } else if (item.make && item.model) {
      lines.push(`🚗 ${item.make} ${item.model}`);
    }
  }

  lines.push('');

  // Key details with emojis
  if (item.stockNumber) {
    lines.push(`📋 STK#: ${item.stockNumber}`);
  }

  if (item.location) {
    lines.push(`📍 ${item.location}`);
  }

  if (item.price) {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      currency: 'USD',
      style: 'currency',
    }).format(item.price);
    lines.push(`💰 ${formattedPrice}`);
  }

  // Description
  if (item.description) {
    lines.push('');
    lines.push(item.description);
  }

  // Call to action
  lines.push('');
  lines.push('✨ DM us for more details!');
  lines.push('🌐 www.tonkaintl.com');

  // Hashtags
  lines.push('');
  lines.push('#cars #automotive #forsale #tonkaintl #usedcars #dealership');

  return lines.join('\n');
}
