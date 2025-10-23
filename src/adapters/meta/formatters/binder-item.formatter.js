/**
 * Format a Binder inventory item for Facebook/Meta posting
 * Optimized for Facebook's format with clear structure
 */
export function formatBinderItemForMeta(item, baseMessage = '') {
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

  // Key details
  if (item.stockNumber) {
    lines.push(`STK#: ${item.stockNumber}`);
  }

  if (item.location) {
    lines.push(`${item.location}`);
  }

  if (item.price) {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      currency: 'USD',
      style: 'currency',
    }).format(item.price);
    lines.push(formattedPrice);
  }

  // Description
  if (item.description) {
    lines.push('');
    lines.push(item.description);
  }

  // Call to action
  lines.push('');
  lines.push('Call us for more details!');
  lines.push('www.tonkaintl.com');

  return lines.join('\n');
}
