/**
 * Normalize binder database item to standard format
 * Transforms snake_case DB fields to camelCase application format
 */
export function normalizeBinderItem(dbItem) {
  if (!dbItem) {
    return null;
  }

  return {
    category: dbItem.category || null,
    condition: dbItem.condition || null,
    description: dbItem.description || dbItem.equipment_description || null,
    equipmentDescription: dbItem.equipment_description || null,
    hours: dbItem.hours || null,
    images: dbItem.images || [],
    location: dbItem.location || null,
    make: dbItem.make || null,
    model: dbItem.model || null,
    price: dbItem.price || null,
    serialNumber: dbItem.serial_number || null,
    status: dbItem.status || null,
    stockNumber: dbItem.stock_number,
    year: dbItem.year || null,
  };
}
