/**
 * Format a Binder inventory item for YouTube posting
 * Optimized for YouTube's video description format
 */
export function formatBinderItemForYouTube(item, baseMessage = '') {
  const lines = [];

  // Use baseMessage if provided, otherwise construct from item data
  if (baseMessage) {
    lines.push(baseMessage);
  } else {
    // Fallback to constructing from item data
    if (item.year && item.make && item.model) {
      lines.push(`${item.year} ${item.make} ${item.model}`);
    } else if (item.make && item.model) {
      lines.push(`${item.make} ${item.model}`);
    }
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');

  // Key details
  if (item.stockNumber) {
    lines.push(`📋 Stock Number: ${item.stockNumber}`);
  }

  if (item.location) {
    lines.push(`📍 Location: ${item.location}`);
  }

  if (item.price) {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      currency: 'USD',
      style: 'currency',
    }).format(item.price);
    lines.push(`💰 Price: ${formattedPrice}`);
  }

  // Description
  if (item.description) {
    lines.push('');
    lines.push('📝 Description:');
    lines.push(item.description);
  }

  // Call to action
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('🔗 Visit our website for more details:');
  lines.push('www.tonkaintl.com');
  lines.push('');
  lines.push('📞 Call us today!');

  // Tags/Keywords
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('#cars #automotive #forsale #usedcars #tonkaintl #cardealership');

  return lines.join('\n');
}
