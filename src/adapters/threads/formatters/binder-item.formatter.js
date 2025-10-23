/**
 * Format a Binder inventory item for Threads posting
 * Optimized for Threads' conversational format
 */
export function formatBinderItemForThreads(item, baseMessage = '') {
  const lines = [];

  // Use baseMessage if provided, otherwise construct from item data
  if (baseMessage) {
    lines.push(baseMessage);
  } else {
    // Fallback to constructing from item data
    if (item.year && item.make && item.model) {
      lines.push(`Just in: ${item.year} ${item.make} ${item.model}`);
    } else if (item.make && item.model) {
      lines.push(`Just in: ${item.make} ${item.model}`);
    }
  }

  lines.push('');

  // Key details
  if (item.stockNumber) {
    lines.push(`Stock #${item.stockNumber}`);
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
  lines.push('🔗 Link in bio for more details');
  lines.push('www.tonkaintl.com');

  return lines.join('\n');
}
