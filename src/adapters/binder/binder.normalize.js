/**
 * Normalize binder database item to standard format
 * Transforms snake_case DB fields to camelCase application format
 */
export function normalizeBinderItem(dbItem) {
  if (!dbItem) {
    return null;
  }

  // Extract images from web_media
  const images = (dbItem.web_media || [])
    .filter(media => media.type === 'Image')
    .map(image => ({
      filename: image.filename,
      filepath: image.filepath,
      isPrimary: image.is_primary || false,
    }));

  // Get the latest status
  const latestStatus =
    dbItem.item_status && dbItem.item_status.length > 0
      ? dbItem.item_status[dbItem.item_status.length - 1].value
      : null;

  // Get the latest TKI advertised price (most recent)
  const latestPrice =
    dbItem.tki_advertised_prices && dbItem.tki_advertised_prices.length > 0
      ? parseFloat(
          dbItem.tki_advertised_prices[dbItem.tki_advertised_prices.length - 1]
            .value.$numberDecimal
        )
      : null;

  // Extract item details for web display (for_web: true)
  const webDetails = (dbItem.item_details || [])
    .filter(detail => detail.for_web === true)
    .reduce((acc, detail) => {
      acc[detail.name] = detail.value;
      return acc;
    }, {});

  // Build flat location string (only city, state, zip allowed)
  let locationString = null;
  if (dbItem.location) {
    const locationParts = [];
    if (dbItem.location.city) locationParts.push(dbItem.location.city);
    if (dbItem.location.state) locationParts.push(dbItem.location.state);
    if (dbItem.location.zip) locationParts.push(dbItem.location.zip);
    if (locationParts.length > 0) {
      locationString = locationParts.join(', ');
    }
  }

  return {
    category: dbItem.industry || null,
    description: dbItem.title || null,
    images: images,
    itemDetails: webDetails,
    location: locationString,
    make: dbItem.manufacturer || null,
    model: dbItem.model || null,
    price: latestPrice,
    status: latestStatus,
    stockNumber: dbItem.stock_number,
    title: dbItem.title || null,
    unitNumber: dbItem.unit_number || null,
    year: dbItem.year || null,
  };
}
