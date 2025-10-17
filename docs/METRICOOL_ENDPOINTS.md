# TKI Social - Metricool Integration

## Philosophy & Design

**Core Concept**: Metricool serves as the **unified social media distribution engine** for TKI Social. Your inventory becomes social content → Metricool distributes across platforms → Staff customizes with AI tools → Posts get scheduled/published.

**Key Principles**:

- **One API call = One post with multiple networks** (not one post per network)
- **Draft-first workflow** - Create drafts for human review, then schedule
- **Bidirectional sync** - Changes in Metricool dashboard flow back to our system
- **Stock-centric organization** - Every post links to inventory via `stock_number`

## Data Architecture

### MetricoolPosts Model (Flattened Structure)

```javascript
{
  // Our business fields
  metricool_id: "252906130",      // Required, unique
  stock_number: "21001",          // Required, links to campaign
  status: "draft",                // draft, scheduled, published, failed
  created_at: Date,
  updated_at: Date,

  // Metricool fields (no duplication, snake_case)
  id: 252906130,
  text: "🚗 RELIABLE WORKHORSE! Check out this...",
  uuid: "6632916186918637371",
  creation_date: {
    date_time: "2025-10-16T15:20:00",
    timezone: "America/Chicago"
  },
  publication_date: {
    date_time: "2025-12-08T10:00:00",
    timezone: "America/Chicago"
  },
  providers: [{
    network: "facebook",
    status: "PENDING",
    detailed_status: "Pending"
  }],
  draft: true,
  auto_publish: false,
  creator_user_id: 4189470,
  creator_user_mail: "stephen@tonkaintl.com",
  media: ["https://example.com/image.jpg"],
  media_alt_text: [null],
  twitter_data: { type: "POST" },
  facebook_data: { type: "POST" },
  instagram_data: { auto_publish: false },
  linkedin_data: { type: "POST" },
  tiktok_data: { type: "POST" }
}
```

**Key Design Decisions**:

- ❌ **No data duplication** - eliminated nested `metricool_response` object
- ✅ **Flattened structure** - all fields at top level for easier querying
- ✅ **Required fields** - both `metricool_id` and `stock_number` must exist
- ✅ **Platform data preserved** - twitter_data, facebook_data, etc. stored separately

## API Endpoints

### Core CRUD Operations

```
POST   /api/social/campaigns/:campaignId/metricool/draft        # Create draft
PATCH  /api/social/campaigns/:campaignId/metricool/:postId/schedule  # Schedule
DELETE /api/social/campaigns/:campaignId/metricool/:postId     # Delete
GET    /api/social/campaigns/:campaignId/metricool/refresh     # Sync changes
```

### Global Operations

```
GET    /api/social/metricool/posts/all                         # List all posts
GET    /api/social/metricool/posts/all?sync=true               # List + sync to DB
GET    /api/social/metricool/posts/all?includePublished=true   # Include published
```

## Process Flows

### 1. Content Creation Flow

```
Campaign Data → Draft Creation → Staff Review → Scheduling → Publishing
     ↓              ↓               ↓            ↓            ↓
   TKI DB    →   Metricool    →  Dashboard  →  Metricool  →  Social Networks
```

**Steps**:

1. **POST** `/campaigns/ABC123/metricool/draft` - Creates draft in Metricool
2. Staff opens Metricool dashboard to customize content
3. **PATCH** `/campaigns/ABC123/metricool/252904001/schedule` - Converts to scheduled
4. Metricool publishes to social networks at scheduled time

### 2. Sync & Discovery Flow

```
Metricool API → Database Sync → Orphan Detection → Status Updates
      ↓              ↓              ↓                ↓
   All Posts   →  Update Existing → Flag Orphans → Track Changes
```

**Steps**:

1. **GET** `/metricool/posts/all?sync=true` - Retrieves all Metricool posts
2. System updates existing database records with latest data
3. Posts without `stock_number` are flagged as orphaned (created outside system)
4. Changes made in Metricool dashboard are synced back to database

### 3. Refresh & Change Detection

```
Database Query → Metricool API → Compare Data → Update Records
      ↓              ↓              ↓              ↓
   Campaign Posts → Current Status → Detect Diffs → Sync Changes
```

**Steps**:

1. **GET** `/campaigns/ABC123/metricool/refresh` - Gets posts for specific campaign
2. Compares database records with current Metricool data
3. Updates text, dates, status changes made directly in Metricool
4. Marks deleted posts as `failed` status

## Endpoint Details

### 1. Create Draft Post

**`POST /api/social/campaigns/:campaignId/metricool/draft`**

Creates a draft post linked to inventory for staff review and customization.

```json
// Request
{
  "text": "🚗 RELIABLE WORKHORSE! This 2006 John Deere...",
  "providers": [{ "network": "facebook" }],
  "media": ["https://example.com/image.jpg"],
  "publicationDate": {
    "dateTime": "2025-12-08T10:00:00",
    "timezone": "America/Chicago"
  },
  "draft": true,
  "autoPublish": false
}

// Response
{
  "success": true,
  "message": "Draft post created successfully in Metricool",
  "data": {
    "campaignId": "21001",
    "metricoolPost": {
      "id": 252906130,
      "status": "draft",
      "text": "🚗 RELIABLE WORKHORSE! This 2006...",
      "publishDate": "2025-12-08T10:00:00"
    }
  }
}
```

### 2. Schedule Post

**`PATCH /api/social/campaigns/:campaignId/metricool/:postId/schedule`**

Converts a draft post to scheduled status with specific publish time.

```json
// Request
{
  "publish_datetime": "2025-12-15T14:00:00Z"
}

// Response
{
  "success": true,
  "message": "Post scheduled successfully in Metricool",
  "data": {
    "campaignId": "21001",
    "metricoolPost": {
      "id": 252906130,
      "status": "scheduled",
      "publishDate": "2025-12-15T14:00:00Z"
    }
  }
}
```

### 3. List All Posts (with Sync)

**`GET /api/social/metricool/posts/all?sync=true`**

Retrieves all posts from Metricool and optionally syncs them to database.

```json
// Response
{
  "success": true,
  "message": "Metricool posts retrieved successfully and 4 posts synced to database",
  "count": 6,
  "data": [
    {
      "id": 252906275,
      "uuid": "abc-123-def",
      "text": "Check out our latest product!",
      "draft": false,
      "publicationDate": {
        "dateTime": "2025-11-17T14:00:00Z"
      },
      "providers": [
        {
          "network": "facebook",
          "status": "PENDING"
        }
      ],
      "media": ["https://example.com/image.jpg"]
    }
  ],
  "filters": {
    "includePublished": false
  },
  "sync": {
    "created": 0,
    "updated": 4,
    "errors": 0
  }
}
```

### 4. Refresh Campaign Posts

**`GET /api/social/campaigns/:campaignId/metricool/refresh`**

Syncs database with changes made directly in Metricool dashboard.

```json
// Response
{
  "success": true,
  "message": "Refreshed 3 posts: 2 updated, 0 deleted",
  "data": {
    "campaignId": "21001",
    "postsRefreshed": 3,
    "postsUpdated": 2,
    "postsDeleted": 0,
    "refreshResults": [
      {
        "action": "updated",
        "metricool_id": "252906130",
        "changes": {
          "text_changed": true,
          "date_changed": false,
          "status_changed": false
        }
      }
    ]
  }
}
```

## Workflow Integration

### Staff Dashboard Integration

1. **Metricool Calendar View** - Posts appear with correct dates and draft status
2. **AI Content Enhancement** - Staff can use Metricool's AI tools to optimize text
3. **Platform Optimization** - Customize content for each social network
4. **Media Management** - Add/edit images and alt text
5. **Scheduling Control** - Set optimal posting times

### System Integration Points

- **Campaign Creation** → Auto-generates draft posts
- **Inventory Updates** → Can trigger post updates via refresh
- **Status Tracking** → Database stays in sync with Metricool
- **Analytics Flow** → Post performance feeds back to campaign metrics

## Error Handling & Edge Cases

### Robust Error Handling

- **404 Posts** - Gracefully handle posts deleted in Metricool
- **Duplicate Keys** - Model indexes prevent duplicate metricool_ids
- **API Rate Limits** - Exponential backoff and retry logic
- **Field Mapping** - Handles camelCase API ↔ snake_case database conversion

### Data Consistency

- **Required Fields** - Both metricool_id and stock_number must exist
- **Sync-Only Updates** - Never creates new posts, only updates existing ones
- **Orphan Detection** - Posts without stock_number are flagged but preserved
- **Change Detection** - Compares dates, text, and status for updates

## Authentication & Security

All endpoints require Bearer token authentication:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Security Features**:

- Campaign-scoped operations (staff can only access their assigned campaigns)
- Metricool API credentials stored securely in environment variables
- Database operations use parameterized queries to prevent injection

## Current Status

**✅ Production Ready Features**:

- Complete CRUD operations for Metricool posts
- Bidirectional sync between Metricool and database
- Draft-first workflow with scheduling
- Change detection and refresh capabilities
- Flattened data model eliminating duplication
- Comprehensive error handling

**🔄 Active Development**:

- Webhook integration for real-time status updates
- Bulk operations for multi-campaign management
- Performance analytics integration

---

**Last Updated**: October 17, 2025  
**Integration Status**: ✅ Production Ready  
**Database**: MongoDB with flattened metricool_posts collection  
**API Version**: Metricool v2 scheduler/posts endpoint
