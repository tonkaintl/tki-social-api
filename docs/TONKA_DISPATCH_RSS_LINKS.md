# Tonka Dispatch RSS Feed Registry

## Purpose

The Feed Registry is an internal editorial management system for RSS feeds consumed by Tonka Dispatch workflows. It serves as the **single source of truth** for which feeds are ingested, how they're prioritized, and why they matter.

### What It Does

- **Stores RSS feed URLs** as first-class records with editorial metadata
- **Prevents duplicate feeds** via RSS URL uniqueness constraints
- **Tracks editorial preference** using a "dinner table score" (0–100): _"How interesting would this be to discuss at dinner?"_
- **Classifies feeds** into operational tiers (Core / Outlier / Rejected / Archived)
- **Enables/disables feeds** for ingestion without deletion
- **Documents decisions** via notes field (especially rejection rationale)

### What It Does NOT Do

- ❌ RSS parsing or content extraction
- ❌ Feed ingestion or scheduling
- ❌ Scraping or data collection
- ❌ Public-facing authentication (internal tool only)

---

## Data Model

### Core Fields

| Field                | Type    | Required    | Description                                                    |
| -------------------- | ------- | ----------- | -------------------------------------------------------------- |
| `rss_url`            | String  | ✓           | RSS feed URL (unique constraint)                               |
| `name`               | String  |             | Feed display name (auto-populate from feed later)              |
| `category`           | String  |             | Editorial category (e.g., "Tech", "Finance", "Culture")        |
| `tier`               | String  | ✓           | `core` \| `outlier` \| `rejected` \| `archived`                |
| `notes`              | String  | Conditional | Editorial context; **required if tier=rejected**               |
| `enabled`            | Boolean | ✓           | Whether feed is active for ingestion (default: true)           |
| `feedspot_feed_id`   | String  |             | FeedSpot's feed ID for tracking discovery source (optional)    |
| `feedspot_folder_id` | String  |             | FeedSpot's folder ID for tracking discovery context (optional) |
| `rejected_reason`    | String  |             | Specific reason if rejected (supports notes)                   |
| `created_at`         | Date    | Auto        | Record creation timestamp                                      |
| `updated_at`         | Date    | Auto        | Last modification timestamp                                    |

### Tier System

**Editorial classification** (user decides):

- **Core** (`core`): High-quality, essential feeds you'd miss if they disappeared
- **Outlier** (`outlier`): Candidate feeds under evaluation (interesting sometimes)
- **Rejected** (`rejected`): Feeds deemed unsuitable (high friction/noise)
- **Archived** (`archived`): Previously used but no longer needed

---

## API Endpoints

### 1. Upsert Feed

**`POST /api/dispatch/feeds`**

**Purpose**: Create or update a feed by `rss_url` (idempotent)

**Request Body**:

```json
{
  "rss_url": "https://example.com/feed.xml",
  "name": "Example Feed",
  "category": "Tech",
  "tier": "core",
  "notes": "Daily must-read for industry news",
  "enabled": true,
  "feedspot_feed_id": "3816087",
  "feedspot_folder_id": "7934302"
}
```

**Response** (200 OK):

```json
{
  "feed": {
    /* complete feed object */
  },
  "created": false,
  "requestId": "req_abc123"
}
```

**Validation**:

- `rss_url` required
- `tier` must be valid enum value
- If `tier=rejected`, `notes` becomes required

---

### 2. List Feeds

**`GET /api/dispatch/feeds`**

**Purpose**: Retrieve feeds with filtering and sorting

**Query Parameters**:

- `tier` (string): Filter by tier (core|outlier|rejected|archived)
- `category` (string): Filter by category
- `enabled` (boolean): Filter by enabled status
- `sort` (string): Sort field (default: `-created_at`)

**Example**:

```
GET /api/dispatch/feeds?tier=core&enabled=true&sort=-created_at
```

**Response** (200 OK):

```json
{
  "feeds": [
    {
      /* feed object */
    }
  ],
  "count": 42,
  "filters": {
    "tier": "core",
    "enabled": true
  },
  "requestId": "req_abc123"
}
```

---

### 3. Update Feed

**`PATCH /api/dispatch/feeds/:id`**

**Purpose**: Partial update of feed attributes (enable/disable, tier changes, score adjustments)

**Request Body**:

```json
{
  "tier": "outlier",
  "enabled": false,
  "notes": "Demoted: quality declined over time"
}
```

**Response** (200 OK):

```json
{
  "feed": {
    /* updated feed object */
  },
  "requestId": "req_abc123"
}
```

**Common Use Cases**:

- Toggle `enabled` without changing other fields
- Promote/demote tier
- Update score after editorial review
- Add/update notes

---

## Integration with n8n Workflows

The Feed Registry becomes the **first step** in daily Tonka Dispatch runs:

### Workflow Pattern

```javascript
// 1. Load Core feeds (always run)
GET /api/dispatch/feeds?tier=core&enabled=true

// 2. Load Outlier feeds (rotation logic applied externally)
GET /api/dispatch/feeds?tier=outlier&enabled=true

// 3. Apply per-feed caps and continue pipeline
// (RSS parsing, content extraction, etc. happens downstream)
```

### Tier Strategy

- **Core feeds**: Run every day, no rotation needed
- **Outlier feeds**: Rotation groups (e.g., Group A Mon/Thu, Group B Tue/Fri)
  - Prevents feed fatigue
  - Keeps variety high
  - Rotation logic lives in n8n, not the registry

---

## Mobile-First UX Notes

### Rate Feed Form (`/dispatch/feeds/new`)

**Must-haves**:

- Large RSS URL input field (paste from clipboard)
- Preset tier buttons: **Core** | **Outlier** | **Reject**
- Category dropdown
- Notes field (single line, expands if tier=rejected)

**Behavior**:

- One-handed friendly (large touch targets)
- Submit = upsert (no duplicate handling needed)
- Success state: "Saved ✓" + show updated record

### Feed List View (`/dispatch/feeds`)

**Filters**:

- Tier (Core/Outlier/Rejected/Archived)
- Category
- Enabled/Disabled

**Sort options**:

- Created date (newest first)
- Last updated
- Name (alphabetical)

**Quick actions** (one-tap):

- Promote to Core
- Demote to Outlier
- Reject / Archive
- Toggle enabled

---

## Anti-Duplication Strategy

### Current Implementation

- Database-level uniqueness constraint on `rss_url`
- Upsert operation handles duplicates automatically

### Future Enhancements (Optional)

- URL normalization:
  - Strip UTM parameters
  - Trailing slash consistency
  - Protocol normalization (http → https)
- `canonical_url_hash` field for fuzzy matching

---

## Success Metrics

This feature is successful when:

1. **You can add/rate a feed in < 10 seconds** from your phone
2. **Duplicate feeds are impossible** (enforced by DB)
3. **n8n workflows use this as the source of truth** for feed selection
4. **Rejected feeds stay in the system** with documented reasons
5. **Tier changes are one-tap actions** (promote/demote/reject)

---

## Technical Constraints

- **Internal use only**: No public authentication needed
- **Follow existing patterns**: Use `writersRoomAds` as reference implementation
- **No clever abstractions**: Clarity > cleverness
- **Mobile-first**: Large touch targets, one-handed operation
- **Idempotent operations**: Upsert, not create+update

---

## Future Considerations (Not MVP)

- Feed health metrics (last successful fetch, error count)
- Rotation group assignment (A/B/C/D/E schedules)
- Auto-discovery of feed name from RSS metadata
- Bulk operations (enable/disable multiple feeds)
- Feed performance analytics (which feeds drive engagement)
