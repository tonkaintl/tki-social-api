# Writer's Room API Integration Guide

**Version:** 1.0.0  
**Date:** December 15, 2025  
**Base URL:** `https://api.tonkaintl.com` (production) or `http://localhost:4300` (development)

---

## Overview

The TKI Social API now includes comprehensive endpoints for managing Writer's Room generated content. Writer's Room is a multi-LLM content generation system that produces high-quality social media posts, blog articles, and creative content with AI-driven research, multiple writing perspectives, and visual prompts.

---

## Authentication

All API endpoints require Bearer token authentication via Azure AD.

```http
Authorization: Bearer {your_token}
```

**Webhook endpoints** use `x-internal-secret` header (n8n only).

---

## Endpoints

### 1. **List Writer's Room Content**

Get a paginated, filterable list of Writer's Room generated content.

**Endpoint:** `GET /api/writers-room-content`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (min: 1) |
| `limit` | integer | `50` | Items per page (max: 100) |
| `status` | string | - | Filter by status: `pending`, `sent`, `failed`, `archived` |
| `brand` | string | - | Filter by brand (see Brand List below) |
| `mode` | string | - | Filter by content mode (see Platform Modes below) |
| `sortBy` | string | `created_at` | Sort field: `created_at`, `updated_at`, `status` |
| `sortOrder` | string | `desc` | Sort direction: `asc` or `desc` |

**Example Request:**

```http
GET /api/writers-room-content?brand=tonka_blog&mode=blog_post&page=1&limit=20&sortOrder=desc
Authorization: Bearer {token}
```

**Response (200 OK):**

```json
{
  "content": [
    {
      "_id": "6940a36887e77739dd413280",
      "content_id": "wrc_1765843816493_tonka_blog",
      "status": "sent",
      "project_mode": "blog_post",
      "project": {
        "brand": "tonka_blog",
        "mode": "blog_post",
        "audience": "truck buyers who are cautious..."
      },
      "final_draft": {
        "title": "Patience Pays: How to Avoid the Mousetrap...",
        "thesis": "In the used Class 8 truck market...",
        "summary": "This Tonka Blog post reminds...",
        "draft_markdown": "Everyone loves free cheese...",
        "role": "Head Writer"
      },
      "creative": {
        "creativity_to_reporter": 90,
        "fact_to_fiction": 15,
        "length": "short",
        "tone_strictness": 30
      },
      "writer_panel": [
        { "role": "comedy", "weight": 0.1 },
        { "role": "documentary", "weight": 0.7 },
        { "role": "action", "weight": 0.2 }
      ],
      "research": {
        "enable_research": true,
        "facts": "Most buyers do not take time...",
        "findings": ["DOT Level 1...", "Pre-trip inspections..."],
        "sources": ["https://..."],
        "citations": ["https://..."]
      },
      "visual_prompts": [
        {
          "id": "vp-01",
          "intent": "hero",
          "prompt": "Wide, steady still of a used Class 8..."
        }
      ],
      "platform_summaries": {
        "youtube": "Discover how patience and thorough...",
        "linkedin": "For professionals in trucking...",
        "x": "Buying a used Class 8 truck? Don't rush...",
        "meta": "Used Class 8 truck buyers: avoid rushed...",
        "tonkaintl": "Tonka Blog shares essential..."
      },
      "title_variations": [
        "Avoiding the Mousetrap: A Patient Approach...",
        "Why Patience Is Your Best Tool...",
        "Steer Clear of Costly Mistakes...",
        "The Smart Buyer's Guide...",
        "How to Spot a Trap..."
      ],
      "future_story_arc_generator": {
        "arcs": [
          {
            "arc_title": "Buying in Bulk: How Fleet...",
            "one_line_premise": "When scaling a small fleet...",
            "why_it_matters": "A single bad truck is costly...",
            "suggested_story_seed": "Practical checklist for..."
          }
        ]
      },
      "outputs": {
        "blog_post": true,
        "future_story_arc": true,
        "visual_prompts": true,
        "mongo_log": true,
        "gdocs_folder_id": "1EFwmu8YdaRT-yGGGm1kFv_8DIcVZ07re"
      },
      "notifier_email": "team@tonkaintl.com",
      "created_at": "2025-12-15T23:50:16.493Z",
      "updated_at": "2025-12-15T23:50:16.510Z",
      "email_sent_at": "2025-12-15T23:50:16.510Z"
    }
  ],
  "count": 1,
  "pagination": {
    "currentPage": 1,
    "limit": 20,
    "totalCount": 1,
    "totalPages": 1
  },
  "filters": {
    "brand": "tonka_blog",
    "mode": "blog_post",
    "status": null
  },
  "requestId": "req_abc123"
}
```

---

### 2. **Webhook: Create Writer's Room Content**

Receives content from n8n Writer's Room workflow. **Internal use only** (n8n automation).

**Endpoint:** `POST /api/webhooks/writers-room/content`

**Headers:**
```
Content-Type: application/json
x-internal-secret: {n8n_secret}
```

**Request Body:** (See Data Model below)

**Response (200 OK):**

```json
{
  "content_id": "wrc_1765843816493_tonka_blog",
  "documentId": "6940a36887e77739dd413280",
  "status": "sent",
  "notifier_email": "team@tonkaintl.com"
}
```

---

## Data Model

### Writer's Room Content Object

```typescript
interface WritersRoomContent {
  _id: string;
  content_id: string; // Unique identifier (auto-generated if not provided)
  status: 'pending' | 'sent' | 'failed' | 'archived';
  
  // Content metadata
  project_mode: PlatformMode; // See Platform Modes
  project: {
    brand: PlatformBrand; // See Brand List
    mode: PlatformMode;
    audience: string;
    brand_meta?: {
      name: string;
      slug: string;
      tagline: string;
      voice: string;
      guidelines: {
        do: string[];
        dont: string[];
        style_examples?: string[];
      };
    };
  };
  
  // Generated content
  final_draft: {
    title: string;
    thesis: string;
    summary: string;
    draft_markdown: string; // Full article in Markdown
    role: string; // Usually "Head Writer"
  };
  
  // Creative parameters
  creative: {
    creativity_to_reporter: number; // 0-100
    fact_to_fiction: number; // 0-100
    length: 'short' | 'medium' | 'long';
    tone_strictness: number; // 0-100
  };
  
  // Writer collaboration
  writer_panel: Array<{
    role: WritingGenre;
    weight: number; // 0-1
  }>;
  
  writers: {
    action?: { enabled: boolean; weight: number };
    biographer?: { enabled: boolean; weight: number };
    comedy?: { enabled: boolean; weight: number };
    documentary?: { enabled: boolean; weight: number };
    historic?: { enabled: boolean; weight: number };
    scifi?: { enabled: boolean; weight: number };
  };
  
  writer_notes?: {
    action?: { role: string; weight: number; notes: string[] };
    comedy?: { role: string; weight: number; notes: string[] };
    documentary?: { role: string; weight: number; notes: string[] };
    // ... other genres
  };
  
  // Research data
  research?: {
    enable_research: boolean;
    facts: string;
    findings: string[];
    sources: string[]; // URLs
    citations: string[]; // URLs
    role: string;
    weight: number;
  };
  
  // Visual content
  visual_prompts: Array<{
    id: string; // e.g., "vp-01"
    intent: string; // e.g., "hero", "detail", "environment"
    prompt: string; // Detailed image generation prompt
  }>;
  
  // Platform-specific summaries
  platform_summaries?: {
    youtube?: string;
    linkedin?: string;
    x?: string;
    meta?: string;
    tonkaintl?: string;
  };
  
  // Alternative titles
  title_variations: string[]; // Up to 5 alternative titles
  
  // Future content suggestions
  future_story_arc_generator?: {
    arcs: Array<{
      arc_title: string;
      one_line_premise: string;
      why_it_matters: string;
      suggested_story_seed: string;
    }>;
  };
  
  // Output configuration
  outputs: {
    blog_post?: boolean;
    future_story_arc?: boolean;
    visual_prompts?: boolean;
    reference_doc?: boolean;
    screenplay?: boolean;
    socials?: boolean;
    story_prompts?: boolean;
    mongo_log?: boolean;
    gdocs_folder_id?: string; // Google Drive folder ID
  };
  
  // System fields
  story_seed?: string;
  target_audience?: string;
  target_brand?: any;
  head_writer_system_message?: string;
  project_mode_profile?: any;
  revision?: {
    revisionCount: number;
    max_revisions: number;
  };
  tokens?: {
    writer_token_count: number;
  };
  
  // Email notification
  notifier_email: string; // Required
  send_email?: boolean; // Default: true
  email_sent_at?: Date;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}
```

---

## Constants & Enums

### Brand List (PlatformBrand)

```typescript
type PlatformBrand =
  | 'diesel_kings'
  | 'echoloop'
  | 'generic_brand'
  | 'ketosis_lifestyle_project'
  | 'purple_star'
  | 'theater_404'
  | 'tonka_blog'
  | 'tonka_newsletter';
```

### Platform Modes (PlatformMode)

```typescript
type PlatformMode =
  | 'blog_post'
  | 'future_story_arc'
  | 'mixed_allegory'
  | 'novella_chapter'
  | 'reference_doc'
  | 'screenplay'
  | 'social_post'
  | 'story_prompts'
  | 'straight_ad'
  | 'visual_prompts';
```

### Writing Genres (WritingGenre)

```typescript
type WritingGenre =
  | 'Action'
  | 'Biography'
  | 'Comedy'
  | 'Documentary'
  | 'Historic'
  | 'Research'
  | 'SciFi';
```

### Content Status

```typescript
type ContentStatus = 'pending' | 'sent' | 'failed' | 'archived';
```

---

## Usage Examples

### Fetch Recent Blog Posts for Tonka Blog

```javascript
const response = await fetch(
  'https://api.tonkaintl.com/api/writers-room-content?' +
  'brand=tonka_blog&' +
  'mode=blog_post&' +
  'status=sent&' +
  'page=1&' +
  'limit=10&' +
  'sortBy=created_at&' +
  'sortOrder=desc',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const data = await response.json();
```

### Display Content in UI

```javascript
data.content.forEach(item => {
  console.log('Title:', item.final_draft.title);
  console.log('Summary:', item.final_draft.summary);
  console.log('Brand:', item.project.brand);
  console.log('Created:', new Date(item.created_at).toLocaleDateString());
  console.log('Visual Prompts:', item.visual_prompts.length);
  console.log('---');
});
```

### Filter by Multiple Criteria

```javascript
// Get all Comedy-heavy content across all brands
const comedyContent = await fetch(
  'https://api.tonkaintl.com/api/writers-room-content?limit=100',
  { headers: { 'Authorization': `Bearer ${token}` } }
);

const filtered = comedyContent.content.filter(item => 
  item.writer_panel.some(w => w.role === 'comedy' && w.weight > 0.5)
);
```

---

## Error Handling

All endpoints return standard error responses:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "requestId": "req_abc123"
}
```

**Common Error Codes:**

- `AUTHENTICATION_FAILED` (401) - Missing or invalid Bearer token
- `VALIDATION_ERROR` (400) - Invalid request parameters
- `WRITERS_ROOM_CONTENT_FETCH_FAILED` (500) - Server error
- `MISSING_STOCK_NUMBER` (400) - Required parameter missing

---

## Notes for Frontend Developers

1. **Large Payloads:** The `draft_markdown` field can be very large (multiple KB). Consider pagination and lazy loading.

2. **Google Drive Links:** If `outputs.gdocs_folder_id` is present, you can construct Drive URLs:
   ```
   https://drive.google.com/drive/folders/{gdocs_folder_id}
   ```

3. **Visual Prompts:** These are AI image generation prompts. Display them as-is or use them to generate images via Midjourney/DALL-E.

4. **Platform Summaries:** Pre-generated summaries optimized for each social platform. Use these for quick previews or social sharing.

5. **Title Variations:** Great for A/B testing or letting users choose their preferred title.

6. **Future Story Arcs:** Suggest follow-up content ideas to writers/editors.

7. **Research Citations:** Always display `research.sources` and `research.citations` for transparency.

8. **Writer Panel Weights:** Visualize the creative "recipe" (e.g., 70% Documentary, 20% Action, 10% Comedy).

---

## Database Collection

**MongoDB Collection:** `writers_room_contents`

**Indexes:**
- `content_id` (unique)
- `created_at` (descending)
- `status`
- `project.brand`
- `project_mode`

---

## Support

For questions or issues, contact the TKI Development Team.
