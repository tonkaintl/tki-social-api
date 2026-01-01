# Tonka Dispatch Newsletter API - Postman Testing Checklist

## Setup

### Environment Variables

Create these variables in your Postman environment:

```
BASE_URL = http://localhost:4300
BEARER_TOKEN = your_azure_ad_token
INTERNAL_SECRET = your_internal_secret
NEWSLETTER_ID = (will be set during tests)
ARTICLE_ID = (will be set during tests)
BATCH_ID = 00dc14d4-c552-4ebc-ae42-61b99fbe9e01
RANKING_ID = (get from rankings list)
```

---

## Test 1: Create Newsletter from Rankings Batch

**Endpoint:** `POST {{BASE_URL}}/api/dispatch/newsletters`

**Headers:**

```
Authorization: Bearer {{BEARER_TOKEN}}
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "Weekly Trucking Dispatch - Jan 1, 2026",
  "source_batch_id": "{{BATCH_ID}}",
  "hero_image_url": "https://example.com/hero.jpg",
  "testing_emails": ["test@example.com"],
  "status": "draft"
}
```

**Expected Response:** `201 Created`

```json
{
  "status": "success",
  "newsletter": {
    "_id": "...",
    "title": "Weekly Trucking Dispatch - Jan 1, 2026",
    "status": "draft",
    "source_batch_id": "{{BATCH_ID}}",
    "hero_image_url": "https://example.com/hero.jpg",
    "testing_emails": ["test@example.com"],
    "articles": [
      {
        "_id": "...",
        "tonka_dispatch_rankings_id": "...",
        "custom_order": 0,
        "is_manual_section": false,
        ...
      }
    ],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

**Tests to Run:**

- [ ] Status code is 201
- [ ] Response contains newsletter object
- [ ] Newsletter has correct title
- [ ] Status is "draft"
- [ ] Articles array has 10 items (matching batch)
- [ ] Articles are ordered by custom_order (0-9)
- [ ] Each article has tonka_dispatch_rankings_id
- [ ] is_manual_section is false for all articles

**Save Variables:**

```javascript
// In Postman Tests tab
pm.environment.set('NEWSLETTER_ID', pm.response.json().newsletter._id);
pm.environment.set('ARTICLE_ID', pm.response.json().newsletter.articles[0]._id);
```

---

## Test 2: Create Empty Newsletter

**Endpoint:** `POST {{BASE_URL}}/api/dispatch/newsletters`

**Request Body:**

```json
{
  "title": "Manual Newsletter - Testing"
}
```

**Expected Response:** `201 Created`

**Tests to Run:**

- [ ] Status code is 201
- [ ] Articles array is empty
- [ ] Status defaults to "draft"
- [ ] source_batch_id is null
- [ ] hero_image_url is null

---

## Test 3: Create Newsletter with Specific Rankings

**Endpoint:** `POST {{BASE_URL}}/api/dispatch/newsletters`

**Request Body:**

```json
{
  "title": "Curated Newsletter - Top 3",
  "ranking_ids": ["{{RANKING_ID}}", "ranking_id_2", "ranking_id_3"]
}
```

**Expected Response:** `201 Created`

**Tests to Run:**

- [ ] Status code is 201
- [ ] Articles array has exactly 3 items
- [ ] Articles match the specified ranking IDs

---

## Test 4: List All Newsletters

**Endpoint:** `GET {{BASE_URL}}/api/dispatch/newsletters`

**Headers:**

```
x-internal-secret: {{INTERNAL_SECRET}}
```

**Expected Response:** `200 OK`

```json
{
  "newsletters": [...],
  "count": 10,
  "totalCount": 25,
  "page": 1,
  "totalPages": 3,
  "filters": {}
}
```

**Tests to Run:**

- [ ] Status code is 200
- [ ] newsletters is an array
- [ ] count matches newsletters.length
- [ ] totalCount >= count
- [ ] page is 1
- [ ] totalPages is calculated correctly

---

## Test 5: List Newsletters with Filters

**Endpoint:** `GET {{BASE_URL}}/api/dispatch/newsletters?status=draft&page=1&limit=5`

**Tests to Run:**

- [ ] All returned newsletters have status "draft"
- [ ] count <= 5
- [ ] filters object shows applied filters

---

## Test 6: Search Newsletters

**Endpoint:** `GET {{BASE_URL}}/api/dispatch/newsletters?search=Weekly`

**Tests to Run:**

- [ ] All returned newsletters have "Weekly" in title (case-insensitive)

---

## Test 7: Get Single Newsletter

**Endpoint:** `GET {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}`

**Headers:**

```
x-internal-secret: {{INTERNAL_SECRET}}
```

**Expected Response:** `200 OK`

**Tests to Run:**

- [ ] Status code is 200
- [ ] newsletter.\_id matches NEWSLETTER_ID
- [ ] newsletter.articles is populated
- [ ] articles[].tonka_dispatch_rankings_id is populated (full ranking object)

---

## Test 8: Get Newsletter Without Population

**Endpoint:** `GET {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}?populate_rankings=false`

**Tests to Run:**

- [ ] articles[].tonka_dispatch_rankings_id is just an ObjectId string (not populated)

---

## Test 9: Update Newsletter Metadata

**Endpoint:** `PATCH {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}`

**Headers:**

```
Authorization: Bearer {{BEARER_TOKEN}}
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "Weekly Trucking Dispatch - Updated",
  "hero_image_url": "https://example.com/new-hero.jpg",
  "testing_emails": ["test1@example.com", "test2@example.com"]
}
```

**Expected Response:** `200 OK`

**Tests to Run:**

- [ ] Status code is 200
- [ ] newsletter.title is updated
- [ ] newsletter.hero_image_url is updated
- [ ] newsletter.testing_emails has 2 items
- [ ] newsletter.updated_at is more recent

---

## Test 10: Schedule Newsletter

**Endpoint:** `PATCH {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}`

**Request Body:**

```json
{
  "status": "scheduled",
  "scheduled_date": "2026-01-05T09:00:00Z"
}
```

**Expected Response:** `200 OK`

**Tests to Run:**

- [ ] Status code is 200
- [ ] newsletter.status is "scheduled"
- [ ] newsletter.scheduled_date is set

---

## Test 11: Mark Newsletter as Sent

**Endpoint:** `PATCH {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}`

**Request Body:**

```json
{
  "status": "sent"
}
```

**Expected Response:** `200 OK`

**Tests to Run:**

- [ ] Status code is 200
- [ ] newsletter.status is "sent"
- [ ] newsletter.sent_date is automatically set

---

## Test 12: Try to Modify Sent Newsletter (Should Fail)

**Endpoint:** `PATCH {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}`

**Request Body:**

```json
{
  "status": "draft"
}
```

**Expected Response:** `400 Bad Request`

**Tests to Run:**

- [ ] Status code is 400
- [ ] Error code is "INVALID_STATUS_TRANSITION"
- [ ] Error message mentions sent newsletters cannot be modified

---

## Test 13: Add Article from Ranking

**Endpoint:** `POST {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}/articles`

**Note:** First, create a new draft newsletter for this test

**Request Body:**

```json
{
  "tonka_dispatch_rankings_id": "{{RANKING_ID}}",
  "custom_order": 0,
  "custom_title": "Custom Title Override",
  "custom_image_url": "https://example.com/custom.jpg"
}
```

**Expected Response:** `200 OK`

**Tests to Run:**

- [ ] Status code is 200
- [ ] article object returned
- [ ] article.tonka_dispatch_rankings_id matches RANKING_ID
- [ ] article.custom_title is set
- [ ] article.custom_order is 0
- [ ] article.is_manual_section is false
- [ ] newsletter.articles array includes new article

**Save Variable:**

```javascript
pm.environment.set('ARTICLE_ID', pm.response.json().article._id);
```

---

## Test 14: Add Manual Section

**Endpoint:** `POST {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}/articles`

**Request Body:**

```json
{
  "is_manual_section": true,
  "custom_order": 0,
  "custom_title": "Editor's Note",
  "custom_snippet": "This week we're focusing on bankruptcy trends...",
  "custom_image_url": "https://example.com/editor.jpg"
}
```

**Expected Response:** `200 OK`

**Tests to Run:**

- [ ] Status code is 200
- [ ] article.is_manual_section is true
- [ ] article.tonka_dispatch_rankings_id is null
- [ ] article.custom_title is set
- [ ] article.custom_order is 0
- [ ] Existing article at position 0 was shifted to position 1

---

## Test 15: Add Duplicate Article (Should Fail)

**Endpoint:** `POST {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}/articles`

**Request Body:**

```json
{
  "tonka_dispatch_rankings_id": "{{RANKING_ID}}"
}
```

**Expected Response:** `400 Bad Request`

**Tests to Run:**

- [ ] Status code is 400
- [ ] Error code is "DUPLICATE_ARTICLE"

---

## Test 16: Update Article Overrides

**Endpoint:** `PATCH {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}/articles/{{ARTICLE_ID}}`

**Request Body:**

```json
{
  "custom_title": "Updated Custom Title",
  "custom_snippet": "Updated snippet text...",
  "custom_category": "breaking-news"
}
```

**Expected Response:** `200 OK`

**Tests to Run:**

- [ ] Status code is 200
- [ ] article.custom_title is updated
- [ ] article.custom_snippet is updated
- [ ] article.custom_category is updated
- [ ] article.updated_at is more recent

---

## Test 17: Remove Article from Newsletter

**Endpoint:** `DELETE {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}/articles/{{ARTICLE_ID}}`

**Expected Response:** `200 OK`

**Tests to Run:**

- [ ] Status code is 200
- [ ] message confirms deletion
- [ ] newsletter.articles no longer contains removed article
- [ ] Remaining articles have recalculated custom_order (0-based, sequential)

---

## Test 18: Reorder Articles

**Endpoint:** `POST {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}/articles/reorder`

**Request Body:**

```json
{
  "article_order": [
    "article_id_3",
    "article_id_1",
    "article_id_5",
    "article_id_2",
    "article_id_4"
  ]
}
```

**Expected Response:** `200 OK`

**Tests to Run:**

- [ ] Status code is 200
- [ ] newsletter.articles are in new order
- [ ] custom_order values match array positions (0, 1, 2, 3, 4)

---

## Test 19: Reorder with Invalid Count (Should Fail)

**Endpoint:** `POST {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}/articles/reorder`

**Request Body:**

```json
{
  "article_order": ["article_id_1", "article_id_2"]
}
```

**Expected Response:** `400 Bad Request`

**Tests to Run:**

- [ ] Status code is 400
- [ ] Error code is "INVALID_ARTICLE_ORDER"
- [ ] Error message mentions count mismatch

---

## Test 20: Reorder with Non-existent ID (Should Fail)

**Endpoint:** `POST {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}/articles/reorder`

**Request Body:**

```json
{
  "article_order": ["507f1f77bcf86cd799439011", "article_id_2", "article_id_3"]
}
```

**Expected Response:** `400 Bad Request`

**Tests to Run:**

- [ ] Status code is 400
- [ ] Error code is "INVALID_ARTICLE_ORDER"

---

## Test 21: Delete Newsletter

**Endpoint:** `DELETE {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}`

**Expected Response:** `200 OK`

**Tests to Run:**

- [ ] Status code is 200
- [ ] message confirms deletion

---

## Test 22: Get Deleted Newsletter (Should Fail)

**Endpoint:** `GET {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}`

**Expected Response:** `404 Not Found`

**Tests to Run:**

- [ ] Status code is 404
- [ ] Error code is "NEWSLETTER_NOT_FOUND"

---

## Test 23: Invalid Newsletter ID Format

**Endpoint:** `GET {{BASE_URL}}/api/dispatch/newsletters/invalid-id`

**Expected Response:** `400 Bad Request`

**Tests to Run:**

- [ ] Status code is 400
- [ ] Error message mentions invalid ID format

---

## Test 24: Create Newsletter Without Title (Should Fail)

**Endpoint:** `POST {{BASE_URL}}/api/dispatch/newsletters`

**Request Body:**

```json
{
  "hero_image_url": "https://example.com/hero.jpg"
}
```

**Expected Response:** `400 Bad Request`

**Tests to Run:**

- [ ] Status code is 400
- [ ] Error message mentions title is required

---

## Test 25: Update with Invalid Field (Should Fail)

**Endpoint:** `PATCH {{BASE_URL}}/api/dispatch/newsletters/{{NEWSLETTER_ID}}`

**Request Body:**

```json
{
  "invalid_field": "test",
  "title": "Valid Title"
}
```

**Expected Response:** `400 Bad Request`

**Tests to Run:**

- [ ] Status code is 400
- [ ] Error message lists allowed fields

---

## Test 26: Pagination Testing

**Endpoint:** `GET {{BASE_URL}}/api/dispatch/newsletters?page=1&limit=3`

**Tests to Run:**

- [ ] count = 3
- [ ] page = 1
- [ ] totalPages is calculated correctly

**Endpoint:** `GET {{BASE_URL}}/api/dispatch/newsletters?page=2&limit=3`

**Tests to Run:**

- [ ] page = 2
- [ ] Different newsletters returned than page 1

---

## Test 27: Sort Testing

**Endpoint:** `GET {{BASE_URL}}/api/dispatch/newsletters?sort=-created_at`

**Tests to Run:**

- [ ] Newsletters ordered newest first

**Endpoint:** `GET {{BASE_URL}}/api/dispatch/newsletters?sort=title`

**Tests to Run:**

- [ ] Newsletters ordered alphabetically by title

---

## Complete Workflow Test

### Step 1: Get Rankings Batch

```
GET /api/dispatch/rankings?batch_id={{BATCH_ID}}
```

### Step 2: Create Newsletter from Batch

```
POST /api/dispatch/newsletters
{
  "title": "Complete Workflow Test",
  "source_batch_id": "{{BATCH_ID}}"
}
```

### Step 3: Add Editor's Note at Top

```
POST /api/dispatch/newsletters/{{NEWSLETTER_ID}}/articles
{
  "is_manual_section": true,
  "custom_order": 0,
  "custom_title": "Editor's Note",
  "custom_snippet": "Welcome to this week's dispatch..."
}
```

### Step 4: Customize Top Article

```
PATCH /api/dispatch/newsletters/{{NEWSLETTER_ID}}/articles/{{ARTICLE_ID}}
{
  "custom_title": "BREAKING: Laredo Trucking Files Chapter 11",
  "custom_image_url": "https://cdn.example.com/featured.jpg"
}
```

### Step 5: Remove Low-Priority Article

```
DELETE /api/dispatch/newsletters/{{NEWSLETTER_ID}}/articles/{{ARTICLE_ID}}
```

### Step 6: Reorder Remaining Articles

```
POST /api/dispatch/newsletters/{{NEWSLETTER_ID}}/articles/reorder
{
  "article_order": [...]
}
```

### Step 7: Set Hero Image and Testing Emails

```
PATCH /api/dispatch/newsletters/{{NEWSLETTER_ID}}
{
  "hero_image_url": "https://cdn.example.com/hero.jpg",
  "testing_emails": ["editor@tonka.com", "test@tonka.com"]
}
```

### Step 8: Schedule Newsletter

```
PATCH /api/dispatch/newsletters/{{NEWSLETTER_ID}}
{
  "status": "scheduled",
  "scheduled_date": "2026-01-05T09:00:00Z"
}
```

### Step 9: Retrieve Final Newsletter for Review

```
GET /api/dispatch/newsletters/{{NEWSLETTER_ID}}?populate_rankings=true
```

### Step 10: Mark as Sent

```
PATCH /api/dispatch/newsletters/{{NEWSLETTER_ID}}
{
  "status": "sent"
}
```

**Workflow Tests:**

- [ ] All 10 steps complete successfully
- [ ] Final newsletter has correct structure
- [ ] Articles are properly ordered
- [ ] Custom fields override original ranking data
- [ ] Manual section appears at position 0
- [ ] Status transitions work correctly
- [ ] sent_date is auto-populated

---

## Summary Checklist

### Newsletter CRUD

- [ ] Create newsletter from batch
- [ ] Create empty newsletter
- [ ] Create with specific rankings
- [ ] List newsletters
- [ ] Get single newsletter
- [ ] Update newsletter metadata
- [ ] Delete newsletter

### Article Management

- [ ] Add article from ranking
- [ ] Add manual section
- [ ] Update article overrides
- [ ] Remove article
- [ ] Reorder articles

### Status Management

- [ ] Draft → Scheduled transition
- [ ] Draft → Sent transition
- [ ] Scheduled → Sent transition
- [ ] Prevent modification of sent newsletter

### Filtering & Sorting

- [ ] Filter by status
- [ ] Filter by source_batch_id
- [ ] Search by title
- [ ] Sort by various fields
- [ ] Pagination works correctly

### Error Handling

- [ ] Invalid IDs rejected
- [ ] Missing required fields rejected
- [ ] Invalid fields rejected
- [ ] Duplicate articles rejected
- [ ] Invalid status transitions rejected
- [ ] Invalid reorder arrays rejected

### Data Integrity

- [ ] Rankings populate correctly
- [ ] Custom fields override originals
- [ ] Manual sections work independently
- [ ] Article ordering maintained
- [ ] Timestamps update correctly
- [ ] Validation works on all endpoints
