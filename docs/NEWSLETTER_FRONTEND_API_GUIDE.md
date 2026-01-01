# TKI Social - Tonka Dispatch Newsletter API for Frontend Integration

## Overview

The Newsletter API allows frontend applications to create, manage, and publish curated newsletters from ranked content. This document describes the complete API surface, data models, expected parameters, and integration patterns for building a newsletter management UI.

---

## Base URL

```
http://localhost:4300/api/dispatch
```

---

## Authentication

### Required Headers

**For Mutation Operations (POST, PATCH, DELETE):**

```
Authorization: Bearer {azure_ad_token}
```

**For Read Operations (GET):**

```
x-internal-secret: {internal_secret}
```

**OR**

```
Authorization: Bearer {azure_ad_token}
```

---

## Data Models

### Newsletter Model

```typescript
interface Newsletter {
  _id: string; // MongoDB ObjectId
  title: string; // Newsletter subject/title (required)
  status: 'draft' | 'scheduled' | 'sent'; // Publication status
  hero_image_url: string | null; // Header/hero image URL
  scheduled_date: Date | null; // When to send (ISO 8601)
  sent_date: Date | null; // When actually sent (auto-set)
  testing_emails: string[]; // Test recipient emails
  source_batch_id: string | null; // Original rankings batch UUID
  articles: Article[]; // Embedded article documents
  created_at: Date; // Creation timestamp
  updated_at: Date; // Last modification timestamp
}
```

### Article Model (Subdocument)

```typescript
interface Article {
  _id: string; // Subdocument ObjectId
  tonka_dispatch_rankings_id: string | RankingObject | null; // Reference to ranking (null for manual)
  custom_order: number; // Display position (0-based)
  is_manual_section: boolean; // true = user-created, false = from ranking

  // Override fields (null = use original ranking data)
  custom_title: string | null;
  custom_snippet: string | null;
  custom_link: string | null;
  custom_image_url: string | null;
  custom_category: string | null;
  custom_source_name: string | null;

  added_at: Date;
  updated_at: Date;
}
```

### Ranking Model (Referenced)

When `populate_rankings=true`, articles include full ranking data:

```typescript
interface Ranking {
  _id: string;
  batch_id: string;
  rank: number;
  canonical_id: string;
  title: string;
  snippet: string;
  link: string;
  category: string;
  source_name: string;
  creator: string;
  pub_date_ms: number;
  article_host: string;
  article_root_domain: string;
  feed_match_status: 'matched' | 'no_match' | 'unknown';
  feed_match_reason: string;
  match_method: string;
  tonka_dispatch_rss_links_id: string;
  created_at: Date;
}
```

---

## API Endpoints

### 1. List Newsletters

**GET** `/api/dispatch/newsletters`

Retrieve paginated list of newsletters with filtering, searching, and sorting.

#### Query Parameters

| Parameter         | Type    | Required | Description                                    | Example Values                                                                                                 |
| ----------------- | ------- | -------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `status`          | string  | No       | Filter by publication status                   | `draft`, `scheduled`, `sent`                                                                                   |
| `source_batch_id` | string  | No       | Filter by original rankings batch              | UUID string                                                                                                    |
| `search`          | string  | No       | Search in newsletter titles (case-insensitive) | `Weekly Dispatch`                                                                                              |
| `sort`            | string  | No       | Sort field and direction                       | `created_at`, `-created_at`, `title`, `-title`, `scheduled_date`, `-scheduled_date`, `sent_date`, `-sent_date` |
| `page`            | integer | No       | Page number (1-based)                          | `1`, `2`, `3`                                                                                                  |
| `limit`           | integer | No       | Results per page (max 100)                     | `25`, `50`, `100`                                                                                              |

**Default Sort:** `-created_at` (newest first)

**Default Pagination:** `page=1`, `limit=25`

#### Response

```json
{
  "newsletters": [
    {
      "_id": "677f1234567890abcdef1234",
      "title": "Weekly Trucking Dispatch - Jan 1",
      "status": "draft",
      "hero_image_url": "https://cdn.example.com/hero.jpg",
      "scheduled_date": null,
      "sent_date": null,
      "testing_emails": ["editor@tonka.com"],
      "source_batch_id": "00dc14d4-c552-4ebc-ae42-61b99fbe9e01",
      "articles": [
        {
          "_id": "article_id_1",
          "tonka_dispatch_rankings_id": "ranking_id_1",
          "custom_order": 0,
          "is_manual_section": false,
          "custom_title": null,
          "added_at": "2026-01-01T10:00:00Z",
          "updated_at": "2026-01-01T10:00:00Z"
        }
      ],
      "created_at": "2026-01-01T10:00:00Z",
      "updated_at": "2026-01-01T10:00:00Z"
    }
  ],
  "count": 10,
  "totalCount": 42,
  "page": 1,
  "totalPages": 2,
  "filters": {
    "status": "draft"
  },
  "requestId": "req_xyz"
}
```

#### Frontend Examples

**Load Draft Newsletters:**

```
GET /api/dispatch/newsletters?status=draft&sort=-updated_at&page=1&limit=25
```

**Search Newsletters:**

```
GET /api/dispatch/newsletters?search=Weekly&page=1&limit=25
```

**View Sent Newsletters:**

```
GET /api/dispatch/newsletters?status=sent&sort=-sent_date&page=1&limit=50
```

---

### 2. Get Single Newsletter

**GET** `/api/dispatch/newsletters/:id`

Retrieve a specific newsletter by ID with optional ranking population.

#### Path Parameters

| Parameter | Type   | Required | Description                 |
| --------- | ------ | -------- | --------------------------- |
| `id`      | string | Yes      | Newsletter MongoDB ObjectId |

#### Query Parameters

| Parameter           | Type    | Required | Description                           | Default |
| ------------------- | ------- | -------- | ------------------------------------- | ------- |
| `populate_rankings` | boolean | No       | Include full ranking data in articles | `true`  |

#### Response (with populate_rankings=true)

```json
{
  "newsletter": {
    "_id": "677f1234567890abcdef1234",
    "title": "Weekly Trucking Dispatch - Jan 1",
    "status": "draft",
    "hero_image_url": "https://cdn.example.com/hero.jpg",
    "articles": [
      {
        "_id": "article_id_1",
        "custom_order": 0,
        "custom_title": "BREAKING: Major Trucking Company Files Bankruptcy",
        "custom_image_url": "https://cdn.example.com/custom.jpg",
        "is_manual_section": false,
        "tonka_dispatch_rankings_id": "ranking_id_1",
        "ranking": {
          "_id": "ranking_id_1",
          "rank": 1,
          "title": "Laredo Trucking Company Files for Chapter 11",
          "link": "https://www.ttnews.com/articles/laredo-trucking-bankruptcy",
          "snippet": "Original snippet text...",
          "category": "trucking",
          "source_name": "Transport Topics News",
          ...
        },
        "added_at": "2026-01-01T10:00:00Z"
      }
    ],
    "created_at": "2026-01-01T10:00:00Z",
    "updated_at": "2026-01-01T12:30:00Z"
  },
  "requestId": "req_xyz"
}
```

#### Frontend Usage

**Display Newsletter for Editing:**

```
GET /api/dispatch/newsletters/677f1234567890abcdef1234?populate_rankings=true
```

**Quick Metadata Load:**

```
GET /api/dispatch/newsletters/677f1234567890abcdef1234?populate_rankings=false
```

---

### 3. Create Newsletter

**POST** `/api/dispatch/newsletters`

Create a new newsletter, optionally from a rankings batch.

#### Request Body

```typescript
{
  title: string;                      // Required
  source_batch_id?: string;           // Optional - UUID of rankings batch
  ranking_ids?: string[];             // Optional - Specific ranking IDs to include
  hero_image_url?: string;            // Optional
  testing_emails?: string[];          // Optional
  status?: 'draft' | 'scheduled';     // Optional, defaults to 'draft'
}
```

#### Response

```json
{
  "status": "success",
  "newsletter": {
    "_id": "677f1234567890abcdef1234",
    "title": "Weekly Trucking Dispatch - Jan 1",
    "status": "draft",
    "articles": [...],
    ...
  },
  "requestId": "req_xyz"
}
```

#### Frontend Examples

**Create from Rankings Batch:**

```json
POST /api/dispatch/newsletters
{
  "title": "Weekly Trucking Dispatch - Jan 1, 2026",
  "source_batch_id": "00dc14d4-c552-4ebc-ae42-61b99fbe9e01",
  "hero_image_url": "https://cdn.example.com/hero.jpg",
  "testing_emails": ["editor@tonka.com"]
}
```

**Create Empty Newsletter:**

```json
POST /api/dispatch/newsletters
{
  "title": "Custom Newsletter - Manual Content"
}
```

**Create with Specific Rankings:**

```json
POST /api/dispatch/newsletters
{
  "title": "Top 5 This Week",
  "ranking_ids": ["id1", "id2", "id3", "id4", "id5"]
}
```

---

### 4. Update Newsletter Metadata

**PATCH** `/api/dispatch/newsletters/:id`

Update newsletter-level properties.

#### Allowed Fields

- `title` (string)
- `hero_image_url` (string)
- `status` ('draft' | 'scheduled' | 'sent')
- `scheduled_date` (ISO 8601 date string)
- `testing_emails` (string[])

#### Request Body

```json
{
  "title": "Updated Title",
  "hero_image_url": "https://cdn.example.com/new-hero.jpg",
  "testing_emails": ["test1@tonka.com", "test2@tonka.com"]
}
```

#### Response

```json
{
  "status": "success",
  "newsletter": { ... },
  "requestId": "req_xyz"
}
```

#### Status Transition Rules

| From      | To        | Requirements                 | Auto-Actions            |
| --------- | --------- | ---------------------------- | ----------------------- |
| draft     | scheduled | `scheduled_date` must be set | None                    |
| draft     | sent      | None                         | Sets `sent_date` to now |
| scheduled | draft     | None                         | None                    |
| scheduled | sent      | None                         | Sets `sent_date` to now |
| sent      | any       | ❌ NOT ALLOWED               | -                       |

#### Frontend Examples

**Schedule Newsletter:**

```json
PATCH /api/dispatch/newsletters/677f1234567890abcdef1234
{
  "status": "scheduled",
  "scheduled_date": "2026-01-05T09:00:00Z"
}
```

**Update Testing Recipients:**

```json
PATCH /api/dispatch/newsletters/677f1234567890abcdef1234
{
  "testing_emails": ["editor@tonka.com", "test@tonka.com"]
}
```

---

### 5. Delete Newsletter

**DELETE** `/api/dispatch/newsletters/:id`

Permanently delete a newsletter and all its articles.

#### Response

```json
{
  "status": "success",
  "message": "Newsletter deleted successfully",
  "requestId": "req_xyz"
}
```

---

### 6. Add Article to Newsletter

**POST** `/api/dispatch/newsletters/:id/articles`

Add an article from a ranking or create a manual content section.

#### Request Body (from ranking)

```json
{
  "tonka_dispatch_rankings_id": "ranking_id",
  "custom_order": 5, // Optional, defaults to end
  "custom_title": "Override Title", // Optional
  "custom_snippet": "Override snippet", // Optional
  "custom_image_url": "...", // Optional
  "custom_link": "...", // Optional
  "custom_category": "...", // Optional
  "custom_source_name": "..." // Optional
}
```

#### Request Body (manual section)

```json
{
  "is_manual_section": true,
  "custom_order": 0, // Optional
  "custom_title": "Editor's Note", // Required for manual
  "custom_snippet": "This week...", // Optional
  "custom_image_url": "...", // Optional
  "custom_link": "..." // Optional
}
```

#### Response

```json
{
  "status": "success",
  "article": {
    "_id": "article_id",
    "custom_order": 5,
    ...
  },
  "newsletter": { ... },
  "requestId": "req_xyz"
}
```

#### Frontend Examples

**Add Ranking Article:**

```json
POST /api/dispatch/newsletters/677f1234567890abcdef1234/articles
{
  "tonka_dispatch_rankings_id": "695610d223a86d7f7bfb9c2b",
  "custom_title": "Custom Headline for This Article",
  "custom_image_url": "https://cdn.example.com/featured.jpg"
}
```

**Add Editor's Note at Top:**

```json
POST /api/dispatch/newsletters/677f1234567890abcdef1234/articles
{
  "is_manual_section": true,
  "custom_order": 0,
  "custom_title": "Editor's Note",
  "custom_snippet": "Welcome to this week's Tonka Dispatch. This week we're focusing on..."
}
```

---

### 7. Update Article

**PATCH** `/api/dispatch/newsletters/:id/articles/:article_id`

Update article override fields or manual section content.

#### Path Parameters

- `:id` - Newsletter ID
- `:article_id` - Article subdocument ID

#### Allowed Fields

- `custom_title`
- `custom_snippet`
- `custom_link`
- `custom_image_url`
- `custom_category`
- `custom_source_name`

#### Request Body

```json
{
  "custom_title": "New Custom Title",
  "custom_snippet": "Updated snippet text...",
  "custom_image_url": "https://cdn.example.com/new-image.jpg"
}
```

#### Response

```json
{
  "status": "success",
  "article": { ... },
  "newsletter": { ... },
  "requestId": "req_xyz"
}
```

---

### 8. Remove Article

**DELETE** `/api/dispatch/newsletters/:id/articles/:article_id`

Remove an article from the newsletter. Remaining articles are automatically reordered.

#### Response

```json
{
  "status": "success",
  "message": "Article removed successfully",
  "newsletter": { ... },
  "requestId": "req_xyz"
}
```

---

### 9. Reorder Articles

**POST** `/api/dispatch/newsletters/:id/articles/reorder`

Change the display order of all articles in the newsletter.

#### Request Body

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

**Rules:**

- Must include ALL article IDs currently in newsletter
- Array order determines new `custom_order` (0-based indices)
- Any missing or extra IDs will return 400 error

#### Response

```json
{
  "status": "success",
  "newsletter": { ... },
  "requestId": "req_xyz"
}
```

---

## Frontend Integration Patterns

### 1. Newsletter List View

**Scenario:** Display paginated list with status filters

```typescript
// State Management
interface NewsletterListState {
  newsletters: Newsletter[];
  filters: {
    status: 'draft' | 'scheduled' | 'sent' | null;
    search: string;
  };
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalCount: number;
  };
  sort: string; // e.g., '-created_at'
}

// API Call
async function fetchNewsletters(state: NewsletterListState) {
  const params = new URLSearchParams();

  if (state.filters.status) params.set('status', state.filters.status);
  if (state.filters.search) params.set('search', state.filters.search);
  if (state.sort) params.set('sort', state.sort);
  params.set('page', state.pagination.page.toString());
  params.set('limit', state.pagination.limit.toString());

  const response = await fetch(`/api/dispatch/newsletters?${params}`, {
    headers: { 'x-internal-secret': SECRET },
  });

  return response.json();
}
```

**Recommended UI Components:**

- Status filter dropdown (Draft, Scheduled, Sent, All)
- Search input with debounce (300ms)
- Sort dropdown (Newest, Oldest, Alphabetical, By Schedule Date)
- Pagination controls
- Newsletter cards showing: title, status badge, article count, created date

---

### 2. Newsletter Editor View

**Scenario:** Edit newsletter with drag-and-drop article reordering

```typescript
interface NewsletterEditorState {
  newsletter: Newsletter;
  isDirty: boolean;
  savingStatus: 'idle' | 'saving' | 'saved' | 'error';
}

// Load Newsletter
async function loadNewsletter(id: string) {
  const response = await fetch(
    `/api/dispatch/newsletters/${id}?populate_rankings=true`,
    {
      headers: { 'x-internal-secret': SECRET },
    }
  );
  return response.json();
}

// Update Metadata
async function updateNewsletter(id: string, updates: Partial<Newsletter>) {
  const response = await fetch(`/api/dispatch/newsletters/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  return response.json();
}

// Reorder After Drag-Drop
async function reorderArticles(newsletterId: string, articleIds: string[]) {
  const response = await fetch(
    `/api/dispatch/newsletters/${newsletterId}/articles/reorder`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ article_order: articleIds }),
    }
  );
  return response.json();
}
```

**Recommended UI Components:**

- Newsletter title editor (inline or modal)
- Hero image uploader/URL input
- Status dropdown with validation
- Schedule date picker (shown when status=scheduled)
- Testing emails multi-input
- Article list with drag handles
- Article cards showing:
  - Display order number
  - Title (with override indicator)
  - Source name
  - Custom vs original data indicators
  - Edit/delete buttons
- "Add Article" button → rankings picker modal
- "Add Manual Section" button → content form modal

---

### 3. Article Display Logic

**Scenario:** Display article with override fallback

```typescript
function getArticleDisplayData(article: Article) {
  // If manual section, only custom fields exist
  if (article.is_manual_section) {
    return {
      title: article.custom_title || 'Untitled Section',
      snippet: article.custom_snippet || '',
      link: article.custom_link || null,
      imageUrl: article.custom_image_url || null,
      category: article.custom_category || null,
      sourceName: article.custom_source_name || null,
      isCustomized: false, // Always custom
    };
  }

  // Article from ranking - use overrides or fall back to ranking
  const ranking = article.tonka_dispatch_rankings_id as Ranking;

  return {
    title: article.custom_title || ranking.title,
    snippet: article.custom_snippet || ranking.snippet,
    link: article.custom_link || ranking.link,
    imageUrl: article.custom_image_url || null, // Rankings don't have images
    category: article.custom_category || ranking.category,
    sourceName: article.custom_source_name || ranking.source_name,
    isCustomized: !!(
      article.custom_title ||
      article.custom_snippet ||
      article.custom_link ||
      article.custom_image_url
    ),
    originalRanking: ranking,
  };
}
```

**Recommended UI Indicators:**

- Badge/icon when field is customized (e.g., "✏️ Custom Title")
- "Reset to Original" button for customized fields
- Preview mode showing final newsletter layout
- Side-by-side view: custom vs original

---

### 4. Create Newsletter Workflow

**Scenario:** Multi-step newsletter creation

```typescript
// Step 1: Select Source
type NewsletterSource =
  | { type: 'batch'; batchId: string }
  | { type: 'rankings'; rankingIds: string[] }
  | { type: 'blank' };

// Step 2: Create Newsletter
async function createNewsletterWorkflow(
  title: string,
  source: NewsletterSource,
  options?: {
    heroImageUrl?: string;
    testingEmails?: string[];
  }
) {
  const body: any = { title, ...options };

  if (source.type === 'batch') {
    body.source_batch_id = source.batchId;
  } else if (source.type === 'rankings') {
    body.ranking_ids = source.rankingIds;
  }

  const response = await fetch('/api/dispatch/newsletters', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  // Redirect to editor
  return result.newsletter._id;
}
```

**Recommended UI Flow:**

1. **Source Selection Screen**
   - Option A: "Create from Latest Rankings" → Fetch latest batch
   - Option B: "Select Specific Rankings" → Rankings picker
   - Option C: "Start Blank" → Skip to metadata
2. **Newsletter Details Form**
   - Title input (required)
   - Hero image URL input
   - Testing emails (comma-separated or multi-input)
3. **Create & Redirect to Editor**

---

### 5. Status Management

**Scenario:** Newsletter lifecycle UI

```typescript
interface StatusAction {
  label: string;
  newStatus: Newsletter['status'];
  requiresDate?: boolean;
  confirmMessage?: string;
}

function getAvailableActions(newsletter: Newsletter): StatusAction[] {
  const actions: StatusAction[] = [];

  switch (newsletter.status) {
    case 'draft':
      actions.push({
        label: 'Schedule',
        newStatus: 'scheduled',
        requiresDate: true,
      });
      actions.push({
        label: 'Mark as Sent',
        newStatus: 'sent',
        confirmMessage: 'This will mark the newsletter as sent. Continue?',
      });
      break;

    case 'scheduled':
      actions.push({
        label: 'Unschedule',
        newStatus: 'draft',
      });
      actions.push({
        label: 'Mark as Sent',
        newStatus: 'sent',
        confirmMessage: 'This will mark the newsletter as sent. Continue?',
      });
      break;

    case 'sent':
      // No actions available - sent is final
      break;
  }

  return actions;
}

async function executeStatusChange(
  newsletterId: string,
  action: StatusAction,
  scheduledDate?: string
) {
  const updates: any = { status: action.newStatus };

  if (action.requiresDate && scheduledDate) {
    updates.scheduled_date = scheduledDate;
  }

  return updateNewsletter(newsletterId, updates);
}
```

**Recommended UI:**

- Status badge with color coding:
  - Draft: Gray
  - Scheduled: Blue (with date)
  - Sent: Green (with date)
- Action buttons based on current status
- Date picker modal for scheduling
- Confirmation dialog for "Mark as Sent"
- Disabled editing when status=sent

---

### 6. Rankings Picker Modal

**Scenario:** Add articles from rankings batch

```typescript
interface RankingsPickerProps {
  batchId: string;
  excludeIds: string[]; // Already in newsletter
  onSelect: (rankingIds: string[]) => void;
}

async function fetchRankingsForPicker(batchId: string) {
  const response = await fetch(
    `/api/dispatch/rankings?batch_id=${batchId}&limit=100`,
    {
      headers: { 'x-internal-secret': SECRET },
    }
  );
  return response.json();
}

// Usage
function RankingsPicker({
  batchId,
  excludeIds,
  onSelect,
}: RankingsPickerProps) {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Fetch rankings, filter out excludeIds
  // Render checkbox list
  // On confirm, call onSelect([...selected])
}
```

**Recommended UI:**

- Search/filter within rankings
- Checkbox list showing:
  - Rank number
  - Title
  - Source
  - Category
- "Select All" / "Deselect All"
- Selected count indicator
- Disabled state for rankings already in newsletter

---

## Error Handling

### Common Error Codes

| Code                        | Status | Description                            | Frontend Action                                       |
| --------------------------- | ------ | -------------------------------------- | ----------------------------------------------------- |
| `NEWSLETTER_NOT_FOUND`      | 404    | Newsletter ID doesn't exist            | Show "Newsletter not found" message, redirect to list |
| `ARTICLE_NOT_FOUND`         | 404    | Article ID doesn't exist in newsletter | Refresh newsletter data                               |
| `RANKING_NOT_FOUND`         | 404    | Referenced ranking doesn't exist       | Show error, disable add                               |
| `DUPLICATE_ARTICLE`         | 400    | Article already in newsletter          | Show "Already added" message                          |
| `INVALID_STATUS_TRANSITION` | 400    | Cannot transition between statuses     | Show status rules explanation                         |
| `INVALID_ARTICLE_ORDER`     | 400    | Reorder array doesn't match            | Re-fetch newsletter, try again                        |
| `NEWSLETTER_CREATE_FAILED`  | 500    | Server error creating newsletter       | Show generic error, allow retry                       |

### Error Response Format

```json
{
  "code": "NEWSLETTER_NOT_FOUND",
  "message": "Newsletter not found",
  "requestId": "req_xyz"
}
```

### Frontend Error Handler

```typescript
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();

      // Handle specific error codes
      switch (error.code) {
        case 'NEWSLETTER_NOT_FOUND':
          toast.error('Newsletter not found');
          router.push('/newsletters');
          break;

        case 'INVALID_STATUS_TRANSITION':
          toast.error(error.message);
          break;

        default:
          toast.error('An error occurred. Please try again.');
      }

      throw new Error(error.message);
    }

    return response.json();
  } catch (err) {
    console.error('API call failed:', err);
    throw err;
  }
}
```

---

## Frontend State Management Recommendations

### Newsletter List State

```typescript
{
  newsletters: Newsletter[];
  loading: boolean;
  filters: {
    status: string | null;
    search: string;
  };
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  sort: string;
}
```

### Newsletter Editor State

```typescript
{
  newsletter: Newsletter | null;
  loading: boolean;
  saving: boolean;
  isDirty: boolean;
  selectedArticleId: string | null; // For editing
  showRankingsPicker: boolean;
  showManualSectionForm: boolean;
}
```

### Persistence

**Recommended to persist in localStorage:**

- `newsletter_list_filters` - User's last filter preferences
- `newsletter_list_sort` - Last sort selection
- `newsletter_list_limit` - Preferred page size

**Do NOT persist:**

- Newsletter data (always fetch fresh)
- Authentication tokens (use secure httpOnly cookies)

---

## Typical Frontend Workflows

### Workflow 1: Create Newsletter from Latest Rankings

1. `GET /api/dispatch/rankings?sort=-created_at&limit=1` → Get latest batch_id
2. `POST /api/dispatch/newsletters` with `source_batch_id`
3. Redirect to editor: `GET /api/dispatch/newsletters/:id?populate_rankings=true`
4. User customizes articles
5. Multiple `PATCH /api/dispatch/newsletters/:id/articles/:article_id` calls
6. `PATCH /api/dispatch/newsletters/:id` to set hero image, testing emails
7. `PATCH /api/dispatch/newsletters/:id` to schedule or send

### Workflow 2: Edit Existing Newsletter

1. `GET /api/dispatch/newsletters/:id?populate_rankings=true`
2. Display in editor
3. User reorders articles via drag-drop
4. `POST /api/dispatch/newsletters/:id/articles/reorder`
5. User removes article
6. `DELETE /api/dispatch/newsletters/:id/articles/:article_id`
7. User adds manual section
8. `POST /api/dispatch/newsletters/:id/articles` with `is_manual_section: true`

### Workflow 3: Schedule Newsletter

1. `GET /api/dispatch/newsletters/:id` → Verify status is draft
2. Show date picker modal
3. User selects future date
4. `PATCH /api/dispatch/newsletters/:id` with `status: 'scheduled'`, `scheduled_date: '...'`
5. Show success message with scheduled date

---

## Performance Recommendations

### Pagination

- Default: 25 items per page
- Allow user to select: 25, 50, 100
- Show loading skeleton during fetch
- Implement infinite scroll OR page numbers

### Debouncing

- Search input: 300ms debounce
- Autosave in editor: 1000ms debounce

### Caching

- Cache newsletter list for 30 seconds (SWR pattern)
- Invalidate cache after mutations
- Cache individual newsletter for 60 seconds
- Always fetch fresh on editor mount

### Optimistic Updates

- Article reordering: Update UI immediately, rollback on error
- Article removal: Remove from UI, restore on error
- Status changes: Update badge immediately, rollback on error

---

## UI/UX Best Practices

### Newsletter List View

- Show status badge prominently
- Display article count
- Show scheduled/sent dates when applicable
- Quick action buttons: Edit, Duplicate, Delete
- Bulk selection for batch operations

### Newsletter Editor

- Sticky header with save/status controls
- Live preview mode toggle
- Article cards with drag handles
- Clear visual distinction between:
  - Manual sections (e.g., different background color)
  - Customized articles (e.g., pencil icon)
  - Original articles (default appearance)
- Undo/redo support
- Unsaved changes warning on navigate away

### Article Customization

- Inline editing for quick changes
- Modal for full editing
- "Reset to original" button for each field
- Character count for snippet (e.g., max 200 chars)
- Image preview for custom_image_url

### Status Management

- Visual workflow indicator (Draft → Scheduled → Sent)
- Date validation for scheduling (must be future)
- Warning when scheduling in past (auto-send warning)
- Confirmation dialogs for destructive actions

---

## Sample Component Architectures

### React Example Structure

```
components/
  newsletters/
    NewsletterList.tsx          # List view with filters
    NewsletterCard.tsx          # Individual newsletter card
    NewsletterFilters.tsx       # Filter controls
    NewsletterEditor.tsx        # Main editor view
    ArticleList.tsx             # Draggable article list
    ArticleCard.tsx             # Individual article card
    ArticleEditor.tsx           # Article edit modal
    RankingsPicker.tsx          # Modal to select rankings
    ManualSectionForm.tsx       # Form for manual content
    StatusBadge.tsx             # Status indicator
    StatusActions.tsx           # Status change buttons

hooks/
  useNewsletters.ts             # List management
  useNewsletter.ts              # Single newsletter
  useArticleActions.ts          # Add/update/remove/reorder
  useNewsletterMutations.ts     # Create/update/delete

api/
  newsletters.ts                # All API calls
```

---

## Summary

This API provides complete CRUD operations for newsletter management with the following key features:

✅ **Flexible Creation** - From batches, specific rankings, or blank  
✅ **Rich Customization** - Override any article field  
✅ **Manual Content** - Add custom sections anywhere  
✅ **Drag-and-Drop** - Intuitive article reordering  
✅ **Status Workflow** - Draft → Scheduled → Sent  
✅ **Filtering & Search** - Find newsletters quickly  
✅ **Pagination** - Handle large newsletter lists  
✅ **Data Population** - Efficient ranking loading

The API is designed for a modern React/Vue/Angular frontend with state management and provides all necessary hooks for building a complete newsletter management interface.
