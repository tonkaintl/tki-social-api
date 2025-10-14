/**
 * Format a Binder inventory item for Reddit posting
 * Detailed, community-friendly format with clear structure
 */
export function formatBinderItemForReddit(item) {
  const lines = [];

  // Title-style header
  if (item.year && item.make && item.model) {
    lines.push(`# ${item.year} ${item.make} ${item.model}`);
  } else if (item.make && item.model) {
    lines.push(`# ${item.make} ${item.model}`);
  }

  lines.push('');

  // Specifications as bullet list
  lines.push('**Specifications:**');
  lines.push('');

  if (item.stockNumber) {
    lines.push(`* **Stock Number:** ${item.stockNumber}`);
  }

  if (item.condition) {
    lines.push(`* **Condition:** ${item.condition}`);
  }

  if (item.hours) {
    lines.push(`* **Hours:** ${item.hours.toLocaleString()}`);
  }

  if (item.serialNumber) {
    lines.push(`* **Serial:** ${item.serialNumber}`);
  }

  if (item.location) {
    const locationParts = [];
    if (item.location.city) locationParts.push(item.location.city);
    if (item.location.state) locationParts.push(item.location.state);
    if (locationParts.length > 0) {
      lines.push(`* **Location:** ${locationParts.join(', ')}`);
    }
  }

  if (item.price) {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      currency: 'USD',
      style: 'currency',
    }).format(item.price);
    lines.push(`* **Price:** ${formattedPrice}`);
  }

  lines.push('');

  // Description
  if (item.description) {
    lines.push('**Description:**');
    lines.push('');
    lines.push(item.description);
    lines.push('');
  }

  // Footer with link
  lines.push('---');
  lines.push('');
  lines.push(
    'For more information, visit [tonkaintl.com](https://tonkaintl.com)'
  );

  return lines.join('\n');
}
