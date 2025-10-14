/**
 * Format a Binder inventory item for Facebook/Meta posting
 * Optimized for Facebook's format with emojis and clear structure
 */
export function formatBinderItemForMeta(item) {
  const lines = [];

  // Title with tractor emoji
  if (item.year && item.make && item.model) {
    lines.push(`🚜 ${item.year} ${item.make} ${item.model}`);
  } else if (item.make && item.model) {
    lines.push(`🚜 ${item.make} ${item.model}`);
  }

  lines.push('');

  // Key details
  if (item.stockNumber) {
    lines.push(`📋 Stock #${item.stockNumber}`);
  }

  if (item.condition) {
    lines.push(`✨ Condition: ${item.condition}`);
  }

  if (item.hours) {
    lines.push(`⏱️ Hours: ${item.hours.toLocaleString()}`);
  }

  if (item.location) {
    const locationParts = [];
    if (item.location.city) locationParts.push(item.location.city);
    if (item.location.state) locationParts.push(item.location.state);
    if (locationParts.length > 0) {
      lines.push(`📍 ${locationParts.join(', ')}`);
    }
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
  lines.push('📞 Call us for more details!');
  lines.push('🌐 www.tonkaintl.com');

  return lines.join('\n');
}
