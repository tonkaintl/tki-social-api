/**
 * Format a Binder inventory item for LinkedIn posting
 * Professional tone, business-focused, fewer emojis than Meta
 */
export function formatBinderItemForLinkedIn(item) {
  const lines = [];

  // Title - professional, no emojis
  if (item.year && item.make && item.model) {
    lines.push(`${item.year} ${item.make} ${item.model}`);
  } else if (item.make && item.model) {
    lines.push(`${item.make} ${item.model}`);
  }

  lines.push('');

  // Key specifications
  const specs = [];
  if (item.stockNumber) specs.push(`Stock #${item.stockNumber}`);
  if (item.condition) specs.push(item.condition);
  if (item.hours) specs.push(`${item.hours.toLocaleString()} hours`);
  if (item.location) {
    specs.push(item.location);
  }

  if (specs.length > 0) {
    lines.push(specs.join(' | '));
    lines.push('');
  }

  // Description
  if (item.description) {
    lines.push(item.description);
    lines.push('');
  }

  // Price
  if (item.price) {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      currency: 'USD',
      style: 'currency',
    }).format(item.price);
    lines.push(`Price: ${formattedPrice}`);
    lines.push('');
  }

  // Professional CTA
  lines.push('Contact Tonkin International for more information.');
  lines.push('www.tonkaintl.com');

  // Hashtags for LinkedIn
  const hashtags = ['#HeavyEquipment', '#Construction', '#Agriculture'];
  if (item.make) hashtags.push(`#${item.make.replace(/\s+/g, '')}`);
  lines.push('');
  lines.push(hashtags.join(' '));

  return lines.join('\n');
}
