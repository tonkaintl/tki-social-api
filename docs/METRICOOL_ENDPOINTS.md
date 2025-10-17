# Metricool API Endpoints

## Overview

The TKI Social API provides complete CRUD operations for managing Metricool social media posts. All endpoints require Bearer token authentication.

## Base URL

```
POST /api/social/campaigns/:campaignId/metricool/draft
GET  /api/social/campaigns/:campaignId/metricool/refresh
PATCH /api/social/campaigns/:campaignId/metricool/:postId/schedule
DELETE /api/social/campaigns/:campaignId/metricool/:postId
```

---

## 1. Create Draft Post

**Endpoint:** `POST /api/social/campaigns/:campaignId/metricool/draft`

Creates a new draft post in Metricool and stores metadata in our database.

### Request Body

```json
{
  "text": "Your post content here",
  "providers": [
    {
      "network": "facebook",
      "id": "page_id_optional"
    }
  ],
  "media": ["https://example.com/image.jpg"],
  "publicationDate": {
    "dateTime": "2025-12-01T12:00:00",
    "timezone": "America/Chicago"
  },
  "draft": true,
  "autoPublish": false
}
```

### Required Fields

- `text` - Post content (string)
- `providers` - Array of social networks (facebook, instagram, linkedin, twitter, tiktok, youtube)

### Response

```json
{
  "success": true,
  "message": "Draft post created successfully in Metricool",
  "data": {
    "metricoolId": "252904001",
    "uuid": "test-uuid-123",
    "stockNumber": "TEST-001",
    "status": "draft"
  }
}
```

---

3. **Schedule for Later**

```bash
curl -X POST "http://localhost:3000/api/social/campaigns/TEST-001/metricool/schedule" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Scheduled social media post!",
    "providers": [{"network": "facebook"}],
    "publicationDate": "2025-01-15T10:00:00Z"
  }'
```

4. **Refresh Token**

### URL Parameters

- `campaignId` - Campaign stock number (e.g., "TEST-001")
- `postId` - Metricool post ID (e.g., "252904001")

### Request Body

```json
{
  "publish_datetime": "2025-12-15T14:00:00Z"
}
```

### Business Rules

- Only `draft` posts can be scheduled
- Publish datetime must be in the future
- Uses Metricool's UUID for API updates

### Response

```json
{
  "success": true,
  "message": "Post scheduled successfully",
  "data": {
    "metricoolId": "252904001",
    "status": "scheduled",
    "publishDatetime": "2025-12-15T14:00:00Z"
  }
}
```

---

## 3. Delete Post

**Endpoint:** `DELETE /api/social/campaigns/:campaignId/metricool/:postId`

Deletes a post from Metricool and removes it from our database.

### URL Parameters

- `campaignId` - Campaign stock number
- `postId` - Metricool post ID

### Business Rules

- Only `draft` and `scheduled` posts can be deleted
- Published posts cannot be deleted
- Handles 404 errors gracefully (post already deleted in Metricool)

### Response

```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

---

## 4. Refresh Posts

**Endpoint:** `GET /api/social/campaigns/:campaignId/metricool/refresh`

Syncs local database with changes made directly in Metricool dashboard.

### URL Parameters

- `campaignId` - Campaign stock number

### What It Does

- Fetches current post data from Metricool API
- Compares with stored database records
- Updates changed posts (text, status, publication date)
- Marks deleted posts as `failed` status
- Detects manual changes made in Metricool interface

### Response

```json
{
  "success": true,
  "message": "Posts refreshed successfully",
  "data": {
    "postsChecked": 5,
    "postsUpdated": 2,
    "postsDeleted": 1,
    "summary": "Updated 2 posts, marked 1 as deleted"
  }
}
```

---

## 5. List All Posts

**Endpoint:** `GET /api/social/metricool/posts/all`

Retrieves all scheduled and draft posts from your Metricool account.

### Query Parameters

- `status` (optional) - Comma-separated list of statuses to filter by
  - Available values: `DRAFT`, `PENDING`, `PUBLISHED`, `PUBLISHING`, `ERROR`
  - Default: `DRAFT,PENDING`
- `includePublished` (optional) - Include published posts in results
  - Values: `true` or `false`
  - Default: `false`

### Business Rules

- Returns posts from a wide date range (1 year before/after current date)
- Filters posts by provider status (each post can have multiple providers)
- Only includes posts you have access to via your Metricool API credentials

### Response

```json
{
  "success": true,
  "message": "Metricool posts retrieved successfully",
  "count": 15,
  "data": [
    {
      "id": 252906275,
      "uuid": "abc-123-def",
      "text": "Check out our latest product!",
      "draft": false,
      "publicationDate": {
        "dateTime": "2025-11-17T14:00:00Z"
      },
      "creationDate": {
        "dateTime": "2025-11-16T10:30:00Z"
      },
      "providers": [
        {
          "network": "facebook",
          "status": "PENDING",
          "id": "page_id_123"
        }
      ],
      "media": ["https://example.com/image.jpg"]
    }
  ],
  "filters": {
    "status": ["DRAFT", "PENDING"],
    "includePublished": false
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 - Validation Error

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed: text is required",
  "statusCode": 400
}
```

### 404 - Campaign Not Found

```json
{
  "error": "RESOURCE_NOT_FOUND",
  "message": "Campaign not found",
  "statusCode": 404
}
```

### 500 - Internal Server Error

```json
{
  "error": "INTERNAL_SERVER_ERROR",
  "message": "An unexpected error occurred",
  "statusCode": 500
}
```

---

## Usage Examples

### Complete Workflow

1. **List All Existing Posts**

```bash
curl -X GET "http://localhost:3000/api/social/metricool/posts/all?status=DRAFT,PENDING" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. **Create Draft**

3. **Create Draft**

```bash
curl -X POST "http://localhost:3000/api/social/campaigns/TEST-001/metricool/draft" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Check out our latest product!",
    "providers": [{"network": "facebook"}],
    "draft": true
  }'
```

3. **Schedule for Later**

4. **Schedule for Later**

```bash
curl -X PATCH "http://localhost:3000/api/social/campaigns/TEST-001/metricool/252904001/schedule" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "publish_datetime": "2025-12-15T14:00:00Z"
  }'
```

3. **Check for Changes**

```bash
curl -X GET "http://localhost:3000/api/social/campaigns/TEST-001/metricool/refresh" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

4. **Delete if Needed**

```bash
curl -X DELETE "http://localhost:3000/api/social/campaigns/TEST-001/metricool/252904001" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Database Storage

Posts are stored in the `metricool_posts` collection with:

- `metricool_id` - Metricool's post ID
- `uuid` - Metricool's UUID for updates
- `stock_number` - Links to campaign
- `status` - draft, scheduled, published, failed
- `text`, `networks`, `media` - Post content
- `metricool_publication_date` - When post is scheduled
- `created_at`, `updated_at` - Timestamps

## Authentication

All endpoints require a valid Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

The token is validated using the `verifyToken` middleware before accessing any social routes.
