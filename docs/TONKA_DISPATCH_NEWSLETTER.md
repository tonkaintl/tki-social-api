# Tonka Dispatch Newsletter API

## Project Summary

The Tonka Dispatch Newsletter system allows users to curate and manage email newsletters from ranked content. Users can select articles from ranked batches, manually add custom sections, reorder content, override article properties, and prepare newsletters for distribution.

**Key Features:**

- Create newsletters from ranked content batches
- Add/remove articles and custom sections
- Override article properties (title, image, snippet, etc.)
- Custom article ordering within newsletters
- Newsletter lifecycle management (draft → scheduled → sent)
- Testing email list management
- Hero/header images for newsletters
- Per-article image customization

**Data Flow:**

1. Rankings arrive via webhook → stored in `tonka_dispatch_rankings`
2. User creates newsletter from ranking batch → new `tonka_dispatch_newsletter` document
3. User customizes articles, adds manual sections, sets images
4. User schedules or sends newsletter

---

## Schema Design

### Newsletter Document Structure

```javascript
{
  _id: ObjectId,
  status: 'draft' | 'scheduled' | 'sent',
  title: String,                      // Newsletter title/subject
  hero_image_url: String,             // Optional header image
  scheduled_date: Date,               // When to send (if scheduled)
  sent_date: Date,                    // When actually sent
  testing_emails: [String],           // Array of test recipient emails
  source_batch_id: String,            // Original rankings batch_id (if created from batch)
  articles: [
    {
      _id: ObjectId,                  // Article entry ID
      tonka_dispatch_rankings_id: ObjectId,  // Reference to ranking (null for manual)
      custom_order: Number,           // Display position (0-based)

      // Override fields (null = use original from ranking)
      custom_title: String,
      custom_snippet: String,
      custom_link: String,
      custom_image_url: String,
      custom_category: String,
      custom_source_name: String,

      // Metadata
      is_manual_section: Boolean,     // true if user-created (not from ranking)
      added_at: Date,
      updated_at: Date
    }
  ],
  created_at: Date,
  updated_at: Date
}
```

---

## API Endpoints

### Base Path: `/api/dispatch/newsletters`

---

### 1. Create Newsletter

**POST** `/api/dispatch/newsletters`

Create a new newsletter, optionally from a rankings batch.

**Request Body:**

```json
{
  "title": "Weekly Trucking Dispatch - Jan 1",
  "source_batch_id": "00dc14d4-c552-4ebc-ae42-61b99fbe9e01", // Optional
  "hero_image_url": "https://example.com/header.jpg", // Optional
  "testing_emails": ["test@example.com"], // Optional
  "ranking_ids": ["ranking_id_1", "ranking_id_2"], // Optional - specific rankings to include
  "status": "draft" // Optional - defaults to 'draft'
}
```

**Response:**

```json
{
  "status": "success",
  "newsletter": {
    "_id": "newsletter_id",
    "title": "Weekly Trucking Dispatch - Jan 1",
    "status": "draft",
    "articles": [...],
    "created_at": "2026-01-01T12:00:00Z"
  }
}
```

**Notes:**

- If `source_batch_id` provided, copies all rankings from that batch as articles
- If `ranking_ids` provided, only includes specified rankings
- Articles maintain original rank order as `custom_order`
- All override fields start as `null` (use original ranking data)

---

### 2. List Newsletters

**GET** `/api/dispatch/newsletters`

List newsletters with filtering, search, sorting, and pagination.

**Query Parameters:**

- `status` - Filter by status: `draft`, `scheduled`, `sent`
- `search` - Search in title
- `source_batch_id` - Filter by original batch
- `sort` - Sort field: `created_at`, `-created_at`, `scheduled_date`, `-scheduled_date`, `sent_date`, `-sent_date`
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 25, max: 100)

**Response:**

```json
{
  "newsletters": [...],
  "count": 10,
  "totalCount": 50,
  "page": 1,
  "totalPages": 5,
  "filters": {
    "status": "draft"
  }
}
```

---

### 3. Get Newsletter

**GET** `/api/dispatch/newsletters/:id`

Retrieve a single newsletter with full article details.

**Query Parameters:**

- `populate_rankings` - Boolean (default: true) - Include full ranking data for non-manual articles

**Response:**

```json
{
  "newsletter": {
    "_id": "newsletter_id",
    "title": "Weekly Trucking Dispatch",
    "status": "draft",
    "hero_image_url": "...",
    "articles": [
      {
        "_id": "article_entry_id",
        "custom_order": 0,
        "custom_title": "Custom Override Title",
        "custom_image_url": "...",
        "ranking": {
          // Full ranking data if populate_rankings=true
          "rank": 1,
          "title": "Original Title",
          "link": "...",
          ...
        }
      }
    ],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

### 4. Update Newsletter Metadata

**PATCH** `/api/dispatch/newsletters/:id`

Update newsletter-level properties.

**Request Body:**

```json
{
  "title": "New Title",
  "hero_image_url": "...",
  "status": "scheduled",
  "scheduled_date": "2026-01-05T09:00:00Z",
  "testing_emails": ["test1@example.com", "test2@example.com"]
}
```

**Response:**

```json
{
  "status": "success",
  "newsletter": { ... }
}
```

**Notes:**

- Cannot change `status` to `sent` directly (use send endpoint)
- Setting `sent_date` requires status to be `sent`

---

### 5. Delete Newsletter

**DELETE** `/api/dispatch/newsletters/:id`

Permanently delete a newsletter.

**Response:**

```json
{
  "status": "success",
  "message": "Newsletter deleted successfully"
}
```

---

### 6. Add Article to Newsletter

**POST** `/api/dispatch/newsletters/:id/articles`

Add an article from a ranking or create a manual section.

**Request Body (from ranking):**

```json
{
  "tonka_dispatch_rankings_id": "ranking_id",
  "custom_order": 5, // Optional - defaults to end
  "custom_title": "Override Title", // Optional
  "custom_image_url": "...", // Optional
  "custom_snippet": "...", // Optional
  "custom_link": "...", // Optional
  "custom_category": "...", // Optional
  "custom_source_name": "..." // Optional
}
```

**Request Body (manual section):**

```json
{
  "is_manual_section": true,
  "custom_order": 3,
  "custom_title": "Editor's Note",
  "custom_snippet": "This week we're focusing on...",
  "custom_image_url": "...",
  "custom_link": "..."
}
```

**Response:**

```json
{
  "status": "success",
  "article": {
    "_id": "article_entry_id",
    "custom_order": 5,
    ...
  },
  "newsletter": { ... }
}
```

**Notes:**

- Manual sections require `is_manual_section: true`
- Manual sections have `tonka_dispatch_rankings_id: null`
- If `custom_order` conflicts, existing articles shift down

---

### 7. Update Article in Newsletter

**PATCH** `/api/dispatch/newsletters/:id/articles/:article_id`

Update article overrides or custom section content.

**Request Body:**

```json
{
  "custom_title": "New Title",
  "custom_image_url": "...",
  "custom_snippet": "...",
  "custom_link": "...",
  "custom_category": "...",
  "custom_source_name": "..."
}
```

**Response:**

```json
{
  "status": "success",
  "article": { ... },
  "newsletter": { ... }
}
```

---

### 8. Remove Article from Newsletter

**DELETE** `/api/dispatch/newsletters/:id/articles/:article_id`

Remove an article or manual section from the newsletter.

**Response:**

```json
{
  "status": "success",
  "message": "Article removed successfully",
  "newsletter": { ... }
}
```

**Notes:**

- Remaining articles' `custom_order` values are recalculated

---

### 9. Reorder Articles

**POST** `/api/dispatch/newsletters/:id/articles/reorder`

Change the display order of articles.

**Request Body:**

```json
{
  "article_order": [
    "article_entry_id_3",
    "article_entry_id_1",
    "article_entry_id_5",
    "article_entry_id_2"
  ]
}
```

**Response:**

```json
{
  "status": "success",
  "newsletter": { ... }
}
```

**Notes:**

- Must include ALL article IDs in desired order
- `custom_order` fields are updated to match array indices

---

## Workflow Examples

### Creating Newsletter from Rankings Batch

```bash
# 1. Get rankings batch
GET /api/dispatch/rankings?batch_id=00dc14d4-c552-4ebc-ae42-61b99fbe9e01

# 2. Create newsletter from batch
POST /api/dispatch/newsletters
{
  "title": "Weekly Dispatch - Jan 1",
  "source_batch_id": "00dc14d4-c552-4ebc-ae42-61b99fbe9e01"
}

# 3. Customize first article
PATCH /api/dispatch/newsletters/{newsletter_id}/articles/{article_id}
{
  "custom_title": "Breaking: Major Trucking Company Files Bankruptcy",
  "custom_image_url": "https://cdn.example.com/custom-image.jpg"
}

# 4. Add manual editor's note
POST /api/dispatch/newsletters/{newsletter_id}/articles
{
  "is_manual_section": true,
  "custom_order": 0,
  "custom_title": "Editor's Note",
  "custom_snippet": "Happy New Year! This week's dispatch..."
}

# 5. Schedule newsletter
PATCH /api/dispatch/newsletters/{newsletter_id}
{
  "status": "scheduled",
  "scheduled_date": "2026-01-05T09:00:00Z",
  "testing_emails": ["editor@tonka.com"]
}
```

---

## Status Transitions

```
draft ──→ scheduled ──→ sent
  ↑          ↓
  └──────────┘
```

**Valid Transitions:**

- `draft` → `scheduled`: Set `scheduled_date`
- `draft` → `sent`: Set `sent_date` (manual send)
- `scheduled` → `draft`: Unschedule
- `scheduled` → `sent`: Mark as sent (set `sent_date`)

**Invalid Transitions:**

- `sent` → any other status (newsletters cannot be "unsent")

---

## Error Codes

- `NEWSLETTER_NOT_FOUND` - Newsletter ID doesn't exist
- `ARTICLE_NOT_FOUND` - Article ID doesn't exist in newsletter
- `RANKING_NOT_FOUND` - Referenced ranking doesn't exist
- `INVALID_STATUS` - Invalid status value
- `INVALID_STATUS_TRANSITION` - Cannot transition between statuses
- `DUPLICATE_ARTICLE` - Article already in newsletter
- `INVALID_ARTICLE_ORDER` - Reorder array doesn't match existing articles
- `NEWSLETTER_CREATE_FAILED` - Database error creating newsletter
- `NEWSLETTER_UPDATE_FAILED` - Database error updating newsletter
- `NEWSLETTER_DELETE_FAILED` - Database error deleting newsletter

---

## Notes

### Display Logic

When rendering a newsletter for display:

1. Sort articles by `custom_order` (ascending)
2. For each article:
   - If override field exists (e.g., `custom_title`), use override
   - Otherwise, use original ranking data
   - For manual sections (`is_manual_section: true`), all data comes from custom fields

### Testing Emails

The `testing_emails` array is for storing test recipient addresses. The actual sending logic is handled externally - this API only stores the configuration.

### Image Handling

All images are stored as URL strings. No upload functionality - users must provide accessible image URLs.
