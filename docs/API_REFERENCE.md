# TKI Social API - Frontend Reference

**Base URL**: `http://localhost:4300` (dev) / `https://socialapi.tonkaintl.com` (prod)  
**Authentication**: Bearer Token (Microsoft Entra ID OAuth2)

## Authentication

All API endpoints require Bearer token authentication:

```javascript
headers: {
  'Authorization': 'Bearer your-oauth-token',
  'Content-Type': 'application/json'
}
```

## Core Workflow for Frontend

### Typical User Flow

1. **Create Campaign** → POST `/api/social/campaigns`
2. **View Campaign Details** → GET `/api/social/campaigns/{stockNumber}`
3. **Preview Platform Content** → GET `/api/social/campaigns/{stockNumber}/preview/{platform}`
4. **Manage Media Portfolio** → GET/POST/DELETE `/api/social/campaigns/{stockNumber}/media`
5. **Post to Social Platform** → POST `/api/social/post-item`

---

## Campaign Management

### Create Campaign

**POST** `/api/social/campaigns`

Creates a new campaign from vehicle inventory data.

**Request Body:**

```json
{
  "stockNumber": "21001",
  "createdBy": "user@tonkaintl.com"
}
```

**Response (201):**

```json
{
  "message": "Campaign created successfully",
  "campaign": {
    "_id": "507f1f77bcf86cd799439011",
    "stock_number": "21001",
    "title": "2018 Chevrolet Silverado",
    "description": "Reliable work truck with low miles",
    "status": "draft",
    "created_by": "user@tonkaintl.com",
    "created_at": "2025-10-15T22:30:00.000Z",
    "updated_at": "2025-10-15T22:30:00.000Z",
    "media_urls": []
  },
  "requestId": "abc-123"
}
```

### Get Campaign Details

**GET** `/api/social/campaigns/{stockNumber}`

Returns campaign with fresh Binder data merged in.

**Response (200):**

```json
{
  "campaign": {
    "_id": "507f1f77bcf86cd799439011",
    "stock_number": "21001",
    "title": "2018 Chevrolet Silverado",
    "description": "Reliable work truck",
    "status": "draft",
    "created_by": "user@tonkaintl.com",
    "created_at": "2025-10-15T22:30:00.000Z",
    "updated_at": "2025-10-15T22:30:00.000Z",
    "media_urls": [
      {
        "url": "https://example.com/image1.jpg",
        "media_type": "image",
        "description": "Front view"
      }
    ],
    "binder_data": {
      "make": "Chevrolet",
      "model": "Silverado",
      "year": 2018,
      "price": "$25,999",
      "mileage": "45,000 miles"
    }
  },
  "requestId": "abc-123"
}
```

### List Campaigns

**GET** `/api/social/campaigns`

**Query Parameters:**

- `page` (default: 1)
- `limit` (default: 10)
- `sortBy` (default: updated_at)
- `sortOrder` (asc/desc, default: desc)

**Response (200):**

```json
{
  "campaigns": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCampaigns": 47,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "requestId": "abc-123"
}
```

### Update Campaign

**PUT** `/api/social/campaigns/{stockNumber}`

**Request Body:**

```json
{
  "status": "published",
  "refreshFromBinder": true
}
```

---

## Platform Previews

### Get Platform Preview

**GET** `/api/social/campaigns/{stockNumber}/preview/{platform}`

Generates platform-specific content without saving.

**Parameters:**

- `platform`: linkedin | meta | x | reddit

**Response (200):**

```json
{
  "content": {
    "platform": "linkedin",
    "message": "Professional: 2018 Chevrolet Silverado - Reliable work truck with 45,000 miles. Priced at $25,999. Perfect for business operations. Learn more: https://tonkaintl.com/equipment/21001 #chevrolet #silverado #worktruck #business",
    "media_count": 2,
    "character_count": 187
  },
  "campaign_info": {
    "stock_number": "21001",
    "title": "2018 Chevrolet Silverado"
  },
  "requestId": "abc-123"
}
```

---

## Media Portfolio Management

The media portfolio is a user-curated collection of images/videos for each campaign, separate from Binder inventory media.

### Get Media Portfolio

**GET** `/api/social/campaigns/{stockNumber}/media`

**Response (200):**

```json
{
  "media_urls": [
    {
      "url": "https://example.com/image1.jpg",
      "media_type": "image",
      "description": "Front view",
      "alt": "2018 Chevrolet Silverado front view",
      "tags": ["main", "front", "exterior"]
    },
    {
      "url": "https://example.com/brochure.pdf",
      "media_type": "pdf",
      "description": "Vehicle specs",
      "filename": "silverado-specs.pdf",
      "size": 2048000
    }
  ],
  "total_count": 2,
  "image_video_count": 1,
  "requestId": "abc-123"
}
```

### Add Media to Portfolio

**POST** `/api/social/campaigns/{stockNumber}/media`

**Request Body:**

```json
{
  "mediaUrl": "https://example.com/new-image.jpg",
  "mediaType": "image",
  "description": "Interior view",
  "alt": "Dashboard and seats",
  "tags": ["interior", "dashboard"]
}
```

**Response (201):**

```json
{
  "message": "Media added to portfolio",
  "media_urls": [...], // Updated full portfolio
  "requestId": "abc-123"
}
```

### Remove Media from Portfolio

**DELETE** `/api/social/campaigns/{stockNumber}/media/{index}`

**Response (200):**

```json
{
  "message": "Media removed from portfolio",
  "media_urls": [...], // Updated portfolio
  "requestId": "abc-123"
}
```

---

## Social Media Posting

### Campaign-Based Posting

**POST** `/api/social/post-item`

Posts to social platform using campaign data with dynamic content generation.

**Request Body:**

```json
{
  "stockNumber": "21001",
  "provider": "linkedin",
  "pageIdOrHandle": "tonka-international",
  "utm": {
    "source": "linkedin",
    "medium": "social",
    "campaign": "vehicle-promotion"
  }
}
```

**Response - Success (200):**

```json
{
  "externalPostId": "urn:li:share:1234567890",
  "permalink": "https://linkedin.com/posts/activity-1234567890",
  "raw": {
    "id": "urn:li:share:1234567890",
    "status": "published"
  },
  "status": "success",
  "provider": "linkedin",
  "requestId": "abc-123",
  "stockNumber": "21001"
}
```

**Response - Platform Not Configured (200):**

```json
{
  "externalPostId": null,
  "permalink": null,
  "raw": {
    "campaign": "21001",
    "error": "X/Twitter API credentials not configured",
    "provider": "x"
  },
  "status": "failed",
  "provider": "x",
  "requestId": "abc-123",
  "stockNumber": "21001"
}
```

**Response - API Error (500):**

```json
{
  "externalPostId": null,
  "permalink": null,
  "raw": {
    "error": "Invalid access token"
  },
  "status": "failed",
  "provider": "meta",
  "requestId": "abc-123",
  "stockNumber": "21001"
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "code": "CAMPAIGN_NOT_FOUND",
  "message": "Campaign not found for stock number: 99999",
  "requestId": "abc-123"
}
```

### Common Error Codes

- `CAMPAIGN_NOT_FOUND` (404): Campaign doesn't exist
- `STOCK_NOT_FOUND` (404): Stock number not in Binder
- `MISSING_REQUIRED_FIELD` (400): Required field missing
- `PROVIDER_CONFIG_MISSING` (500): Platform API not configured
- `PROVIDER_REQUEST_FAILED` (500): Platform API error

### HTTP Status Codes

- **200**: Success (including graceful platform failures)
- **201**: Created successfully
- **400**: Bad request (validation error)
- **401**: Unauthorized (invalid/missing token)
- **404**: Resource not found
- **500**: Server error (real API failures)

---

## Frontend Integration Notes

### Media Portfolio UI Recommendations

1. **Portfolio Dialog**: Show existing media with thumbnails
2. **Add Media Button**: Upload or URL input for new media
3. **Media Types**: Filter by image/video for social posting
4. **Remove Option**: Delete media from portfolio

### Platform Posting UI Recommendations

1. **Preview First**: Always show preview before posting
2. **Platform Selection**: Buttons for LinkedIn, Meta, X, Reddit
3. **Status Indication**: Show configured vs unconfigured platforms
4. **Post Results**: Display success/failure with platform links

### Campaign Status Management

- `draft`: Newly created, ready for editing
- `published`: Posted to at least one platform
- `failed`: Posting attempts failed

### Request ID Tracking

Every response includes a `requestId` for debugging and support. Log these for error reporting.

---

This API provides a complete campaign-based social media management system with real platform integration and flexible media management.
