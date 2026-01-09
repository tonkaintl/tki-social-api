# Sparks API Reference

Blog idea sparks for WritersRoom entries.

## Schema

```javascript
{
  _id: ObjectId,
  section: String,        // Title/heading (required, unique)
  concept: String,        // Key theme (required)
  thesis: String,         // Description (required)
  group: String,          // buyers_transparency | industry_culture | selling_vendors
  categories: [String],   // Array of FEED_CATEGORY values (agriculture, logistics, etc.)
  release_order: Number,  // Priority order (default: 0)
  last_used: Date,        // Last time used in WritersRoom
  times_used: Number,     // Usage counter (default: 0)
  created_at: Date,
  updated_at: Date
}
```

## Endpoints

**GET /api/tonka-spark**

- Query: `?group=buyers_transparency&category=logistics&search=text&sort=-created_at&page=1&limit=25`
- Returns: `{ sparks: [], count, totalCount, totalPages, page, filters, requestId }`

**POST /api/tonka-spark** (auth: bearer)

- Body: `{ section, concept, thesis, group?, categories?, release_order?, times_used?, last_used? }`
- Upserts by section (unique key)
- Returns: `{ spark: {}, created: boolean, requestId }`

**PATCH /api/tonka-spark/:id** (auth: bearer)

- Body: Any of: `{ section, concept, thesis, group, categories, release_order, times_used, last_used }`
- Returns: `{ spark: {}, requestId }`

## Group Values

- `buyers_transparency` - 25 sparks about buyer education
- `industry_culture` - 25 sparks about Tonka's voice/culture
- `selling_vendors` - 25 sparks about selling equipment

## Category Values

Same as FEED_CATEGORY: agriculture, building_construction, civil_infrastructure, food_and_beverage, forestry, lifts, logistics, manufacturing, marine, medical, mining, oil_and_gas, power, recycling
