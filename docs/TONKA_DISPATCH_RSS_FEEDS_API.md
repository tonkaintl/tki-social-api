# Tonka Dispatch RSS Feed Registry API

**Version:** 1.0.0  
**Date:** December 30, 2025  
**Base URL:** `https://api.tonkaintl.com` (production) or `http://localhost:4300` (development)

---

## Overview

The RSS Feed Registry provides endpoints for managing the curated collection of RSS feeds used by Tonka Dispatch. Each feed includes editorial ratings (dinner table score), tier classification, categorization, and tracking for FeedSpot discovery sources.

Use these endpoints to:

- Add new RSS feeds or update existing ones (upsert)
- List feeds with filtering and sorting
- Update feed metadata and editorial ratings

---

## Authentication

All endpoints require Bearer token authentication via Azure AD.

```http
Authorization: Bearer {your_token}
```

---

## Endpoints

### 1. **Upsert RSS Feed**

Create a new feed or update an existing one (by `rss_url`). This is an idempotent operation - the same URL will always update the same feed record.

**Endpoint:** `POST /api/dispatch/feeds`

**Request Body:**

| Field                | Type    | Required      | Description                                                |
| -------------------- | ------- | ------------- | ---------------------------------------------------------- |
| `rss_url`            | string  | ✅ Yes        | RSS feed URL (unique identifier, normalized to lowercase)  |
| `name`               | string  | No            | Human-readable feed name                                   |
| `category`           | string  | No            | Feed category (e.g., "trucking", "logistics", "finance")   |
| `tier`               | string  | No            | Classification tier (default: `outlier`)                   |
| `dinner_score`       | number  | No            | Editorial rating 0-100 (default: `50`)                     |
| `notes`              | string  | Conditional\* | Editorial notes (\*required if `tier: 'rejected'`)         |
| `enabled`            | boolean | No            | Whether feed is active (default: `true`)                   |
| `feedspot_feed_id`   | string  | No            | FeedSpot feed identifier (for tracking discovery source)   |
| `feedspot_folder_id` | string  | No            | FeedSpot folder identifier (for tracking discovery source) |
| `rejected_reason`    | string  | No            | Reason for rejection (if applicable)                       |

**Tier Values:**

- `core` - High-quality, essential feeds
- `outlier` - Candidate feeds under evaluation
- `rejected` - Feeds deemed unsuitable (requires `notes`)
- `archived` - Inactive/deprecated feeds

**Example Request:**

```http
POST /api/dispatch/feeds
Authorization: Bearer {token}
Content-Type: application/json

{
  "rss_url": "https://example.com/feed.xml",
  "name": "Trucking Industry News",
  "category": "trucking",
  "tier": "core",
  "dinner_score": 85,
  "notes": "Excellent coverage of Class 8 market trends",
  "enabled": true,
  "feedspot_feed_id": "fs_12345"
}
```

**Response (200 OK):**

```json
{
  "created": false,
  "feed": {
    "_id": "67940a36887e77739dd41328",
    "rss_url": "https://example.com/feed.xml",
    "name": "Trucking Industry News",
    "category": "trucking",
    "tier": "core",
    "dinner_score": 85,
    "notes": "Excellent coverage of Class 8 market trends",
    "enabled": true,
    "feedspot_feed_id": "fs_12345",
    "feedspot_folder_id": null,
    "rejected_reason": null,
    "created_at": "2025-12-30T10:15:00.000Z",
    "updated_at": "2025-12-30T14:22:00.000Z"
  },
  "requestId": "req_abc123"
}
```

**Response Fields:**

- `created` - `true` if new feed was created, `false` if existing feed was updated
- `feed` - Complete feed object with all fields
- `requestId` - Request tracking ID

**Error Responses:**

```json
// 400 - Missing RSS URL
{
  "code": "MISSING_RSS_URL",
  "message": "RSS URL is required",
  "requestId": "req_abc123"
}

// 400 - Invalid dinner score
{
  "code": "INVALID_DINNER_SCORE",
  "message": "Dinner score must be between 0 and 100",
  "requestId": "req_abc123"
}

// 400 - Invalid tier
{
  "code": "INVALID_TIER",
  "message": "Tier must be one of: core, outlier, rejected, archived",
  "requestId": "req_abc123"
}

// 400 - Notes required for rejected tier
{
  "code": "NOTES_REQUIRED_FOR_REJECTED",
  "message": "Notes are required when tier is \"rejected\"",
  "requestId": "req_abc123"
}
```

---

### 2. **List RSS Feeds**

Retrieve feeds with optional filtering and sorting.

**Endpoint:** `GET /api/dispatch/feeds`

**Query Parameters:**

| Parameter  | Type    | Description                                               |
| ---------- | ------- | --------------------------------------------------------- |
| `tier`     | string  | Filter by tier: `core`, `outlier`, `rejected`, `archived` |
| `category` | string  | Filter by category (exact match)                          |
| `enabled`  | boolean | Filter by enabled status: `true` or `false`               |
| `sort`     | string  | Sort field (default: `-dinner_score`)                     |

**Valid Sort Values:**

- `dinner_score` / `-dinner_score` - Score ascending/descending
- `created_at` / `-created_at` - Creation date ascending/descending
- `updated_at` / `-updated_at` - Last update ascending/descending
- `name` / `-name` - Name alphabetically ascending/descending

**Example Request:**

```http
GET /api/dispatch/feeds?tier=core&enabled=true&sort=-dinner_score
Authorization: Bearer {token}
```

**Response (200 OK):**

```json
{
  "count": 2,
  "feeds": [
    {
      "_id": "67940a36887e77739dd41328",
      "rss_url": "https://example.com/feed.xml",
      "name": "Trucking Industry News",
      "category": "trucking",
      "tier": "core",
      "dinner_score": 85,
      "notes": "Excellent coverage of Class 8 market trends",
      "enabled": true,
      "feedspot_feed_id": "fs_12345",
      "feedspot_folder_id": null,
      "rejected_reason": null,
      "created_at": "2025-12-30T10:15:00.000Z",
      "updated_at": "2025-12-30T14:22:00.000Z"
    },
    {
      "_id": "67940b12887e77739dd41329",
      "rss_url": "https://logistics-news.com/rss",
      "name": "Logistics Daily",
      "category": "logistics",
      "tier": "core",
      "dinner_score": 78,
      "notes": "Good general logistics coverage",
      "enabled": true,
      "feedspot_feed_id": null,
      "feedspot_folder_id": null,
      "rejected_reason": null,
      "created_at": "2025-12-30T11:30:00.000Z",
      "updated_at": "2025-12-30T11:30:00.000Z"
    }
  ],
  "filters": {
    "tier": "core",
    "enabled": true
  },
  "requestId": "req_xyz789"
}
```

**Response Fields:**

- `count` - Total number of feeds matching filters
- `feeds` - Array of feed objects
- `filters` - Applied filters (for confirmation)
- `requestId` - Request tracking ID

**Error Responses:**

```json
// 400 - Invalid tier filter
{
  "code": "INVALID_TIER",
  "message": "Tier must be one of: core, outlier, rejected, archived",
  "requestId": "req_xyz789"
}

// 400 - Invalid sort field
{
  "code": "INVALID_SORT_FIELD",
  "message": "Sort must be one of: dinner_score, -dinner_score, created_at, -created_at, updated_at, -updated_at, name, -name",
  "requestId": "req_xyz789"
}
```

---

### 3. **Update RSS Feed**

Partially update a feed by its MongoDB ID. Only provided fields will be updated.

**Endpoint:** `PATCH /api/dispatch/feeds/:id`

**URL Parameters:**

| Parameter | Type   | Description                  |
| --------- | ------ | ---------------------------- |
| `id`      | string | MongoDB ObjectId of the feed |

**Request Body (all fields optional):**

| Field                | Type    | Description            |
| -------------------- | ------- | ---------------------- |
| `name`               | string  | Feed name              |
| `category`           | string  | Feed category          |
| `tier`               | string  | Classification tier    |
| `dinner_score`       | number  | Editorial rating 0-100 |
| `notes`              | string  | Editorial notes        |
| `enabled`            | boolean | Active status          |
| `feedspot_feed_id`   | string  | FeedSpot feed ID       |
| `feedspot_folder_id` | string  | FeedSpot folder ID     |
| `rejected_reason`    | string  | Rejection reason       |

**Example Request:**

```http
PATCH /api/dispatch/feeds/67940a36887e77739dd41328
Authorization: Bearer {token}
Content-Type: application/json

{
  "dinner_score": 90,
  "notes": "Updated after reviewing recent content quality"
}
```

**Response (200 OK):**

```json
{
  "feed": {
    "_id": "67940a36887e77739dd41328",
    "rss_url": "https://example.com/feed.xml",
    "name": "Trucking Industry News",
    "category": "trucking",
    "tier": "core",
    "dinner_score": 90,
    "notes": "Updated after reviewing recent content quality",
    "enabled": true,
    "feedspot_feed_id": "fs_12345",
    "feedspot_folder_id": null,
    "rejected_reason": null,
    "created_at": "2025-12-30T10:15:00.000Z",
    "updated_at": "2025-12-30T15:45:00.000Z"
  },
  "requestId": "req_def456"
}
```

**Error Responses:**

```json
// 400 - Invalid feed ID format
{
  "code": "INVALID_FEED_ID",
  "message": "Invalid feed ID format",
  "requestId": "req_def456"
}

// 400 - No valid fields to update
{
  "code": "NO_UPDATE_FIELDS",
  "message": "No valid fields to update",
  "requestId": "req_def456"
}

// 404 - Feed not found
{
  "code": "FEED_NOT_FOUND",
  "message": "Feed not found",
  "requestId": "req_def456"
}

// 400 - Invalid tier value
{
  "code": "INVALID_TIER",
  "message": "Tier must be one of: core, outlier, rejected, archived",
  "requestId": "req_def456"
}

// 400 - Notes required for rejected tier
{
  "code": "NOTES_REQUIRED_FOR_REJECTED",
  "message": "Notes are required when tier is \"rejected\"",
  "requestId": "req_def456"
}
```

---

## Data Model Reference

### Feed Object

```typescript
{
  _id: string;              // MongoDB ObjectId
  rss_url: string;          // Unique RSS feed URL (lowercase, trimmed)
  name?: string;            // Human-readable feed name
  category?: string;        // Feed category
  tier: string;             // 'core' | 'outlier' | 'rejected' | 'archived'
  dinner_score: number;     // Editorial rating 0-100 (default: 50)
  notes?: string;           // Editorial notes (required if tier='rejected')
  enabled: boolean;         // Active status (default: true)
  feedspot_feed_id?: string;    // FeedSpot tracking ID
  feedspot_folder_id?: string;  // FeedSpot folder tracking ID
  rejected_reason?: string;     // Rejection details
  created_at: Date;         // ISO 8601 timestamp
  updated_at: Date;         // ISO 8601 timestamp
}
```

---

## Common Error Codes

| Code                          | HTTP Status | Description                            |
| ----------------------------- | ----------- | -------------------------------------- |
| `MISSING_RSS_URL`             | 400         | RSS URL is required for upsert         |
| `INVALID_DINNER_SCORE`        | 400         | Score must be 0-100                    |
| `INVALID_TIER`                | 400         | Invalid tier value                     |
| `INVALID_SORT_FIELD`          | 400         | Invalid sort parameter                 |
| `INVALID_FEED_ID`             | 400         | Malformed MongoDB ObjectId             |
| `NO_UPDATE_FIELDS`            | 400         | No valid fields provided for update    |
| `NOTES_REQUIRED_FOR_REJECTED` | 400         | Notes required when tier is 'rejected' |
| `FEED_NOT_FOUND`              | 404         | Feed ID doesn't exist                  |
| `VALIDATION_ERROR`            | 400         | Mongoose validation failed             |
| `FEED_UPSERT_FAILED`          | 500         | Server error during upsert             |
| `FEED_LIST_FAILED`            | 500         | Server error during list               |
| `FEED_UPDATE_FAILED`          | 500         | Server error during update             |

---

## Frontend Integration Tips

### 1. **Creating/Updating Feeds**

Always use the upsert endpoint (`POST /api/dispatch/feeds`) when you want to save a feed. It handles both create and update:

```javascript
const response = await fetch('/api/dispatch/feeds', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    rss_url: 'https://example.com/feed.xml',
    name: 'Example Feed',
    tier: 'outlier',
    dinner_score: 75,
  }),
});

const { created, feed } = await response.json();
if (created) {
  console.log('New feed created:', feed._id);
} else {
  console.log('Existing feed updated:', feed._id);
}
```

### 2. **Filtering Active Core Feeds**

```javascript
const response = await fetch(
  '/api/dispatch/feeds?tier=core&enabled=true&sort=-dinner_score',
  {
    headers: { Authorization: `Bearer ${token}` },
  }
);

const { feeds, count } = await response.json();
// feeds array sorted by highest dinner_score first
```

### 3. **Partial Updates**

Use PATCH when you only want to change specific fields:

```javascript
const response = await fetch(`/api/dispatch/feeds/${feedId}`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    enabled: false, // Only update enabled status
    notes: 'Temporarily disabled for review',
  }),
});

const { feed } = await response.json();
```

### 4. **Error Handling**

All errors include a `code` field for programmatic handling:

```javascript
try {
  const response = await fetch('/api/dispatch/feeds', {
    method: 'POST',
    // ...
  });

  if (!response.ok) {
    const error = await response.json();

    switch (error.code) {
      case 'NOTES_REQUIRED_FOR_REJECTED':
        showError('Please add notes when rejecting a feed');
        break;
      case 'INVALID_DINNER_SCORE':
        showError('Dinner score must be between 0 and 100');
        break;
      default:
        showError(error.message);
    }
  }
} catch (err) {
  showError('Network error');
}
```

### 5. **FeedSpot Integration**

When adding feeds discovered via FeedSpot, include tracking IDs:

```javascript
await fetch('/api/dispatch/feeds', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    rss_url: feedUrl,
    name: feedName,
    feedspot_feed_id: '12345',
    feedspot_folder_id: 'logistics_folder',
    tier: 'outlier',
    notes: 'Found via FeedSpot logistics category',
  }),
});
```

---

## Request ID Tracking

All responses include a `requestId` field for debugging and support purposes. Include this ID when reporting issues:

```json
{
  "code": "FEED_NOT_FOUND",
  "message": "Feed not found",
  "requestId": "req_abc123"
}
```

---

## Notes

- **RSS URL Normalization**: URLs are automatically trimmed and converted to lowercase
- **Upsert Behavior**: The `rss_url` field serves as the unique identifier - same URL = same feed
- **Tier Validation**: Changing tier to `rejected` requires notes (either in the request or already existing)
- **Default Sort**: List endpoint defaults to `-dinner_score` (highest rated first)
- **Boolean Filters**: Use string values `'true'` or `'false'` in query parameters

---

**Questions or Issues?** Contact the backend team or check the implementation at `src/routes/tonkaDispatchFeeds.routes.js`
