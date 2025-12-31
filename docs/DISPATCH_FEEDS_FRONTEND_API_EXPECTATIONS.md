# TKI Social - Expected API Parameters for Dispatch RSS Feeds

## GET /api/dispatch/feeds - Expected Query Parameters

The frontend will send the following query parameters to filter, search, sort, and paginate RSS feeds:

### Filtering Parameters

| Parameter | Type | Required | Description | Example Values |
|-----------|------|----------|-------------|----------------|
| `tier` | string | No | Filter by feed tier classification | `core`, `outlier`, `rejected`, `archived` |
| `category` | string | No | Filter by feed category (exact match) | `trucking`, `logistics`, `finance` |
| `enabled` | boolean | No | Filter by enabled status | `true`, `false` |

### Search Parameter

| Parameter | Type | Required | Description | Behavior |
|-----------|------|----------|-------------|----------|
| `search` | string | No | Full-text search across feed fields | Should search: `name`, `rss_url`, `category`, `tier`, `notes` fields (case-insensitive) |

### Sorting Parameter

| Parameter | Type | Required | Description | Valid Values |
|-----------|------|----------|-------------|--------------|
| `sort` | string | No | Sort field and direction | `dinner_score`, `-dinner_score`, `created_at`, `-created_at`, `updated_at`, `-updated_at`, `name`, `-name` |
| | | | Default if not specified | `-dinner_score` (highest score first) |

**Note:** Prefix with `-` for descending order, no prefix for ascending.

### Pagination Parameters

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `page` | integer | No | Page number (1-based) | `1` |
| `limit` | integer | No | Number of results per page | `25` |

---

## Example Requests from Frontend

### 1. Initial Load (Default Filters)
```
GET /api/dispatch/feeds?tier=core&enabled=true&sort=-dinner_score&page=1&limit=25
```

### 2. Search with Filters
```
GET /api/dispatch/feeds?tier=core&enabled=true&sort=-dinner_score&search=trucking&page=1&limit=25
```

### 3. All Categories, Sorted by Name
```
GET /api/dispatch/feeds?enabled=true&sort=name&page=1&limit=50
```

### 4. View Rejected Feeds
```
GET /api/dispatch/feeds?tier=rejected&enabled=false&sort=-updated_at&page=1&limit=25
```

---

## Expected Response Format

```json
{
  "count": 42,
  "feeds": [
    {
      "_id": "67940a36887e77739dd41328",
      "rss_url": "https://example.com/feed.xml",
      "name": "Trucking Industry News",
      "category": "trucking",
      "tier": "core",
      "dinner_score": 85,
      "notes": "Excellent coverage",
      "enabled": true,
      "feedspot_feed_id": "fs_12345",
      "feedspot_folder_id": "folder_678",
      "rejected_reason": null,
      "created_at": "2025-12-30T10:15:00.000Z",
      "updated_at": "2025-12-30T14:22:00.000Z"
    }
  ],
  "filters": {
    "tier": "core",
    "enabled": true,
    "search": "trucking"
  },
  "requestId": "req_xyz789"
}
```

---

## Search Implementation Requirements

The `search` parameter should perform **case-insensitive partial matching** across these fields:

1. **name** - Feed display name
2. **rss_url** - Full RSS URL
3. **category** - Category string
4. **tier** - Tier classification
5. **notes** - Editorial notes

Example: `search=truck` should match:
- name: "**Truck**ing News"
- category: "**truck**ing"
- notes: "Covers Class 8 **truck** market"

---

## Frontend Filter Persistence

The frontend stores these filter preferences in cookies:
- `dispatch_filter_tier` - Last selected tier
- `dispatch_filter_category` - Last selected category  
- `dispatch_filter_enabled` - Last enabled status
- `dispatch_filter_sort` - Last sort option

These are loaded on page mount and sent with every API request.

---

## Notes for Backend Implementation

1. **Search is additive** - If search + filters are both present, apply both (AND logic)
2. **Pagination is server-side** - Return total count in `count` field
3. **Sort default** - If no sort param, use `-dinner_score`
4. **Empty values** - Frontend only sends params with actual values (no empty strings)
5. **Enabled filter** - Frontend sends as string `"true"` or `"false"`, backend should parse to boolean
