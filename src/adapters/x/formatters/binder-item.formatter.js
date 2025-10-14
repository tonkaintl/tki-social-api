/**
 * Format a Binder inventory item for X (Twitter) posting
 * Concise format respecting 280 character limit
 */
export function formatBinderItemForX(item) {
  const parts = [];

  // Compact title
  if (item.year && item.make && item.model) {
    parts.push(`${item.year} ${item.make} ${item.model}`);
  } else if (item.make && item.model) {
    parts.push(`${item.make} ${item.model}`);
  }

  // Essential details only
  if (item.stockNumber) {
    parts.push(`Stock #${item.stockNumber}`);
  }

  if (item.hours) {
    parts.push(`${item.hours.toLocaleString()} hrs`);
  }

  if (item.price) {
    const formattedPrice = new Intl.NumberFormat('en-US', {
      currency: 'USD',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(item.price);
    parts.push(formattedPrice);
  }

  // Join with bullet points for readability
  const mainText = parts.join(' • ');

  // Add URL (will be automatically shortened by X)
  const url = 'tonkaintl.com';

  // Hashtags - keep minimal for X
  const hashtags = ['#HeavyEquipment'];
  if (item.make) {
    hashtags.push(`#${item.make.replace(/\s+/g, '')}`);
  }

  // Combine all parts
  const tweet = `${mainText}\n\n${url}\n\n${hashtags.join(' ')}`;

  // Ensure we're under 280 characters
  if (tweet.length > 280) {
    // Fallback: just essentials
    const essential = `${parts.slice(0, 3).join(' • ')}\n\n${url}`;
    return essential.slice(0, 280);
  }

  return tweet;
}
