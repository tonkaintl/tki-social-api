# Tonka Dispatch Newsletter - Creation Methods

## Overview

There are two primary methods for creating newsletters in the Tonka Dispatch system:

1. **Feed-Based Creation** - Create a newsletter from ranked content associated with specific RSS feeds
2. **Manual Creation** - Build a newsletter from scratch by manually adding content sections

This document explains both approaches, their use cases, and implementation details.

---

## Method 1: Feed-Based Newsletter Creation

### Concept

Feed-based newsletters are created from ranked content that has been matched to specific RSS feeds in your feed registry (`tonka_dispatch_rss_links`). This method leverages the automated content discovery and ranking system.

### Data Flow

```
tonka_dispatch_rss_links (feed registry)
         ↓
tonka_dispatch_rankings (ranked articles with tonka_dispatch_rss_links_id)
         ↓
tonka_dispatch_newsletters (curated newsletter)
```

### When to Use

- **Automated Content Curation** - You want to create newsletters from content that's been automatically discovered and ranked
- **Feed-Specific Newsletters** - Create newsletters focused on specific sources (e.g., "Top Stories from Transport Topics")
- **Batch Processing** - Create newsletters from the latest ranking batch delivered by your content ranking system
- **Time-Saving** - Quickly generate newsletters from pre-vetted, ranked content

### Implementation Options

#### Option A: Create from Batch (All Rankings)

Create a newsletter containing ALL ranked articles from a specific batch.

**API Call:**
```http
POST /api/dispatch/newsletters
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Weekly Trucking Dispatch - Jan 1, 2026",
  "source_batch_id": "00dc14d4-c552-4ebc-ae42-61b99fbe9e01"
}
```

**What Happens:**
1. System finds all rankings with matching `batch_id`
2. Creates newsletter with all articles in their original rank order
3. Articles maintain reference to source rankings via `tonka_dispatch_rankings_id`
4. Newsletter tracks original batch via `source_batch_id`

**Best For:**
- Weekly/daily digest newsletters
- "Top 10 This Week" style newsletters
- Automated newsletter generation from ranking pipeline

---

#### Option B: Create from Specific Rankings

Create a newsletter from hand-picked rankings (potentially filtered by feed).

**Step 1: Get Rankings from Specific Feed**

```http
GET /api/dispatch/rankings?tonka_dispatch_rss_links_id={feed_id}&limit=50
x-internal-secret: {secret}
```

This returns all ranked articles that were matched to a specific RSS feed.

**Step 2: Select Specific Rankings**

Frontend displays rankings and user selects which ones to include.

**Step 3: Create Newsletter with Selected Rankings**

```http
POST /api/dispatch/newsletters
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Transport Topics - Top Stories",
  "ranking_ids": [
    "695610d223a86d7f7bfb9c2b",
    "695610d223a86d7f7bfb9c2c",
    "695610d223a86d7f7bfb9c2d",
    "695610d223a86d7f7bfb9c2e",
    "695610d223a86d7f7bfb9c2f"
  ]
}
```

**What Happens:**
1. System loads each ranking by ID
2. Creates newsletter with articles in the order provided in `ranking_ids` array
3. Each article references its source ranking
4. `source_batch_id` is NOT set (mixed rankings)

**Best For:**
- Feed-specific newsletters
- Curated "best of" newsletters
- Theme-based newsletters (e.g., "All articles about bankruptcies")

---

#### Option C: Query-Based Creation (Future Enhancement)

**Conceptual Approach** (not yet implemented):

```http
POST /api/dispatch/newsletters
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Top 5 from Freight Waves",
  "query": {
    "tonka_dispatch_rss_links_id": "feed_id_here",
    "limit": 5,
    "feed_match_status": "matched"
  }
}
```

This would create a newsletter from rankings matching the query criteria.

---

### Feed-Based Newsletter Characteristics

✅ **Automatic Population** - Articles populated immediately on creation  
✅ **Ranking References** - Each article maintains link to original ranking  
✅ **Override Capability** - Can customize titles, snippets, images after creation  
✅ **Source Tracking** - `source_batch_id` tracks origin (when using batch method)  
✅ **Feed Metadata** - Articles inherit feed metadata (source_name, category, etc.)

---

## Method 2: Manual Newsletter Creation

### Concept

Manual newsletters are built from scratch without relying on the automated ranking system. Editors create custom content sections and can optionally add individual ranked articles.

### When to Use

- **Custom Content** - Need editor's notes, announcements, commentary
- **Mixed Content** - Combine automated rankings with manual editorial sections
- **Specialized Newsletters** - One-off newsletters for special events or announcements
- **Full Editorial Control** - Want to write original content rather than curate existing articles

### Implementation

#### Step 1: Create Empty Newsletter

```http
POST /api/dispatch/newsletters
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Special Announcement - New Industry Regulations"
}
```

**What Happens:**
- Creates newsletter with NO articles
- `source_batch_id` is `null`
- Newsletter status defaults to `draft`
- Editor builds newsletter by adding articles one at a time

---

#### Step 2: Add Manual Content Sections

Manual sections are custom content written by editors (not from rankings).

**Add Editor's Note:**
```http
POST /api/dispatch/newsletters/{newsletter_id}/articles
Authorization: Bearer {token}
Content-Type: application/json

{
  "is_manual_section": true,
  "custom_order": 0,
  "custom_title": "Editor's Note",
  "custom_snippet": "Welcome to this special edition. This week we're covering the new DOT regulations that went into effect on January 1st..."
}
```

**Add Custom Section:**
```http
POST /api/dispatch/newsletters/{newsletter_id}/articles
Authorization: Bearer {token}
Content-Type: application/json

{
  "is_manual_section": true,
  "custom_title": "Industry Analysis: What These Regulations Mean",
  "custom_snippet": "Our analysis shows that the new hours-of-service rules will impact small carriers disproportionately...",
  "custom_link": "https://tonka.com/analysis/hos-regulations-2026",
  "custom_image_url": "https://cdn.tonka.com/images/hos-analysis.jpg",
  "custom_category": "Analysis"
}
```

**Manual Section Characteristics:**
- `is_manual_section: true`
- `tonka_dispatch_rankings_id: null` (no ranking reference)
- All content comes from `custom_*` fields
- Can include links to your own content/blog posts
- Can set custom categories (not limited to ranking categories)

---

#### Step 3: Optionally Add Ranked Articles

You can mix manual sections with articles from the ranking system.

```http
POST /api/dispatch/newsletters/{newsletter_id}/articles
Authorization: Bearer {token}
Content-Type: application/json

{
  "tonka_dispatch_rankings_id": "695610d223a86d7f7bfb9c2b",
  "custom_order": 2
}
```

This adds a ranked article at position 2 in the newsletter.

---

#### Step 4: Arrange Content Order

Use drag-and-drop in the UI and reorder:

```http
POST /api/dispatch/newsletters/{newsletter_id}/articles/reorder
Authorization: Bearer {token}
Content-Type: application/json

{
  "article_order": [
    "article_id_editor_note",
    "article_id_analysis",
    "article_id_ranking_1",
    "article_id_ranking_2",
    "article_id_conclusion"
  ]
}
```

---

### Manual Newsletter Characteristics

✅ **Full Editorial Control** - Every section is intentionally added  
✅ **Custom Content** - Write original commentary and analysis  
✅ **Mixed Sources** - Combine manual sections + ranked articles  
✅ **Flexible Ordering** - Arrange content in any logical flow  
✅ **Custom Metadata** - Set categories, links, images per section  
❌ **No Batch Tracking** - `source_batch_id` is `null`  
❌ **More Time Intensive** - Requires manual content creation

---

## Comparison Matrix

| Feature | Feed-Based (Batch) | Feed-Based (Selected) | Manual |
|---------|-------------------|----------------------|---------|
| **Speed** | ⚡⚡⚡ Instant | ⚡⚡ Fast | ⚡ Slow |
| **Control** | Low | Medium | High |
| **Custom Content** | ❌ No | ❌ No | ✅ Yes |
| **Ranking References** | ✅ All articles | ✅ Selected articles | ⚡ Optional |
| **source_batch_id** | ✅ Set | ❌ Null | ❌ Null |
| **Best For** | Automated digest | Curated from rankings | Editorial newsletters |
| **Articles on Create** | All from batch | Selected rankings | Zero (build manually) |
| **Editing After Create** | Can customize | Can customize | All fields custom |

---

## Hybrid Approach (Recommended)

The most powerful newsletters combine both methods:

### Workflow Example

**1. Create from Batch** (get ranked content automatically)
```json
POST /api/dispatch/newsletters
{
  "title": "Weekly Dispatch - Jan 1, 2026",
  "source_batch_id": "batch_uuid"
}
```

**2. Add Editor's Note at Top** (manual section)
```json
POST /api/dispatch/newsletters/{id}/articles
{
  "is_manual_section": true,
  "custom_order": 0,
  "custom_title": "Editor's Note",
  "custom_snippet": "Happy New Year! Here are this week's top stories..."
}
```

**3. Customize Specific Articles** (override ranked content)
```json
PATCH /api/dispatch/newsletters/{id}/articles/{article_id}
{
  "custom_title": "BREAKING: Major Carrier Files for Bankruptcy",
  "custom_image_url": "https://cdn.tonka.com/featured-bankruptcy.jpg"
}
```

**4. Remove Low-Quality Articles** (curate the batch)
```json
DELETE /api/dispatch/newsletters/{id}/articles/{article_id}
```

**5. Add Manual Conclusion** (manual section)
```json
POST /api/dispatch/newsletters/{id}/articles
{
  "is_manual_section": true,
  "custom_title": "Looking Ahead",
  "custom_snippet": "Next week we'll be covering the annual trucking convention..."
}
```

**Result:** A newsletter that combines automated content discovery with editorial refinement and original commentary.

---

## Frontend UI Recommendations

### For Feed-Based Creation

**Newsletter Creation Modal:**

```
┌────────────────────────────────────────┐
│  Create Newsletter                     │
├────────────────────────────────────────┤
│                                        │
│  Title: [________________________]     │
│                                        │
│  Source:                               │
│  ○ Latest Rankings Batch              │
│  ○ Select from Feed: [Dropdown ▼]    │
│  ○ Start Blank (Manual)               │
│                                        │
│  [Cancel]              [Create →]     │
└────────────────────────────────────────┘
```

**If "Latest Rankings Batch" selected:**
- Fetch latest batch_id from `/api/dispatch/rankings?sort=-created_at&limit=1`
- Create newsletter with that batch_id
- Redirect to editor showing all articles

**If "Select from Feed" selected:**
- Show dropdown of feeds from `/api/dispatch/feeds`
- Fetch rankings for that feed: `/api/dispatch/rankings?tonka_dispatch_rss_links_id={feed_id}`
- Show checkbox list of rankings
- Create newsletter with selected `ranking_ids`

**If "Start Blank" selected:**
- Create empty newsletter
- Redirect to editor with "Add Content" prompts

---

### For Manual Creation

**Newsletter Editor with Empty State:**

```
┌────────────────────────────────────────┐
│  Weekly Dispatch - Jan 1, 2026        │
│  Status: Draft                         │
├────────────────────────────────────────┤
│                                        │
│     No articles yet                    │
│                                        │
│  [+ Add from Rankings]                 │
│  [+ Add Manual Section]                │
│                                        │
└────────────────────────────────────────┘
```

**Add Manual Section Modal:**

```
┌────────────────────────────────────────┐
│  Add Manual Section                    │
├────────────────────────────────────────┤
│                                        │
│  Title: [________________________]     │
│                                        │
│  Content:                              │
│  [____________________________]        │
│  [____________________________]        │
│  [____________________________]        │
│                                        │
│  Link (optional):                      │
│  [____________________________]        │
│                                        │
│  Image URL (optional):                 │
│  [____________________________]        │
│                                        │
│  Category (optional):                  │
│  [____________________________]        │
│                                        │
│  [Cancel]           [Add Section]     │
└────────────────────────────────────────┘
```

---

## Technical Implementation Notes

### Database Schema Differences

**Feed-Based Newsletter (from batch):**
```javascript
{
  _id: ObjectId("..."),
  title: "Weekly Dispatch",
  source_batch_id: "00dc14d4-c552-4ebc-ae42-61b99fbe9e01", // ✅ Set
  articles: [
    {
      tonka_dispatch_rankings_id: ObjectId("..."), // ✅ Set
      is_manual_section: false,                    // ✅ False
      custom_order: 0
      // custom_* fields are null initially
    }
  ]
}
```

**Manual Newsletter:**
```javascript
{
  _id: ObjectId("..."),
  title: "Special Edition",
  source_batch_id: null,                           // ❌ Null
  articles: [
    {
      tonka_dispatch_rankings_id: null,            // ❌ Null
      is_manual_section: true,                     // ✅ True
      custom_order: 0,
      custom_title: "Editor's Note",               // ✅ Required
      custom_snippet: "Content here..."            // ✅ Set
      // All content from custom_* fields
    }
  ]
}
```

### Display Logic

**For Article Display:**

```javascript
function getArticleContent(article) {
  if (article.is_manual_section) {
    // Manual section - only custom fields exist
    return {
      title: article.custom_title || 'Untitled',
      snippet: article.custom_snippet || '',
      link: article.custom_link || null,
      imageUrl: article.custom_image_url || null,
      category: article.custom_category || null,
      sourceName: article.custom_source_name || null
    };
  } else {
    // From ranking - use custom overrides or fall back to ranking
    const ranking = article.tonka_dispatch_rankings_id; // populated
    
    return {
      title: article.custom_title || ranking.title,
      snippet: article.custom_snippet || ranking.snippet,
      link: article.custom_link || ranking.link,
      imageUrl: article.custom_image_url || null,
      category: article.custom_category || ranking.category,
      sourceName: article.custom_source_name || ranking.source_name
    };
  }
}
```

---

## Summary

### Feed-Based Creation
✅ **Fast** - Automatic population from ranking system  
✅ **Scalable** - Perfect for regular newsletters  
✅ **Data-Driven** - Leverages automated content discovery  
⚠️ **Requires Setup** - Need ranking pipeline running  
⚠️ **Less Customization** - Initially uses ranking data  

### Manual Creation
✅ **Flexible** - Total editorial control  
✅ **Custom Content** - Write original commentary  
✅ **No Dependencies** - Works without ranking system  
⚠️ **Time-Intensive** - Requires manual content entry  
⚠️ **No Automation** - Every article added manually  

### Best Practice: Use Both
Start with feed-based creation for speed, then add manual sections for editorial voice and context. This gives you the best of both worlds: automated content discovery + human curation.
