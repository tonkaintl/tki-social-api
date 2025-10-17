# Metricool Integration Guide - REAL API BEHAVIOR

## Overview

Metricool serves as the **unified social media distribution engine** for TKI Social. This document reflects the **actual API behavior** we discovered through testing, not assumptions.

**Core Value**: Your campaign data becomes social posts → Metricool distributes across platforms → Staff can customize → Posts get scheduled/published.

## What We Learned (October 2025)

### ✅ **Confirmed API Behavior**

- **One API call = One post with one unique ID**
- **Multiple networks per post** - Single post can target multiple platforms
- **Rich response data** - Complete metadata including creator info, platform settings
- **Unique UUIDs** - For post updates and scheduling operations
- **Provider status tracking** - Per-network status within single post

### ❌ **Common Misconceptions**

- ~~One post per network~~ → One post for ALL networks
- ~~Simple response~~ → Rich response with extensive metadata
- ~~Basic text/media~~ → Platform-specific configurations included

## Authentication & API Access

### Real Configuration

```env
METRICOOL_API_TOKEN=your_api_token
METRICOOL_USER_ID=4189470
METRICOOL_BLOG_ID=5391813
```

### API Structure

```
Base URL: https://app.metricool.com/api/v2
Authentication: X-Mc-Auth header + query parameters
Query Params: userToken, userId, blogId (all required)
```

## Post Creation - Actual API

### Request Format (Working)

```json
POST /v2/scheduler/posts?userToken={token}&userId={userId}&blogId={blogId}
{
  "text": "🚜 HEAVY DUTY POWER! This 2006 John Deere...",
  "publicationDate": {
    "dateTime": "2025-12-05T15:30:00",
    "timezone": "America/Chicago"
  },
  "providers": [
    {
      "network": "facebook"
    }
  ],
  "media": [
    "https://example.com/images/car.jpg"
  ],
  "autoPublish": false,
  "draft": true
}
```

### Response Format (Actual)

```json
{
  "success": true,
  "data": {
    "id": 252904322,
    "uuid": "8525485292235081787",
    "text": "🚜 HEAVY DUTY POWER! This 2006 John Deere...",
    "publicationDate": {
      "dateTime": "2025-12-05T15:30:00",
      "timezone": "America/Chicago"
    },
    "creationDate": {
      "dateTime": "2025-10-16T15:13:00",
      "timezone": "America/Chicago"
    },
    "providers": [
      {
        "network": "facebook",
        "status": "PENDING",
        "detailedStatus": "Pending"
      }
    ],
    "media": ["https://example.com/images/car.jpg"],
    "mediaAltText": [null],
    "autoPublish": false,
    "draft": true,
    "twitterData": { "type": "POST" },
    "facebookData": { "type": "POST" },
    "instagramData": { "autoPublish": false },
    "linkedinData": { "type": "POST" },
    "creatorUserMail": "stephen@tonkaintl.com",
    "creatorUserId": 4189470
  }
}
```

## Data Architecture - What We Built

### MetricoolPosts Collection

```javascript
{
  metricool_id: "252904322",        // Unique post ID
  uuid: "8525485292235081787",     // For updates
  stock_number: "171001",          // Links to campaign
  networks: ["facebook"],         // Can be multiple
  status: "draft",                // Our status tracking
  text: "Full post text...",
  metricool_response: {...},      // Complete API response
  // ... all other fields
}
```

### Key Insights

- **One post → Multiple networks** (not one post per network)
- **Rich metadata preservation** (creator info, platform settings)
- **UUID-based updates** (not ID-based)
- **Provider status tracking** (per-network within single post)

## Available Operations

### 1. Create Draft Post

**Endpoint**: `POST /social/campaigns/:campaignId/metricool/draft`

**Purpose**: Create draft post for human review

**Business Flow**:

1. API creates draft in Metricool
2. Staff opens Metricool dashboard
3. Staff customizes with AI tools
4. Staff schedules or publishes

### 2. Schedule Post

**Endpoint**: `PATCH /social/campaigns/:campaignId/metricool/:postId/schedule`

**Purpose**: Convert draft to scheduled post

**Rules**: Only draft posts can be scheduled

### 3. Delete Post

**Endpoint**: `DELETE /social/campaigns/:campaignId/metricool/:postId`

**Purpose**: Remove unwanted posts

**Rules**: Only draft and scheduled posts can be deleted

### 4. Refresh Posts

**Endpoint**: `GET /social/campaigns/:campaignId/metricool/refresh`

**Purpose**: Sync with changes made directly in Metricool

**Detects**:

- Posts deleted in Metricool
- Text/date changes made in dashboard
- Status changes (draft → scheduled)

## Error Handling - Real Scenarios

### Common Issues

```javascript
// Duplicate key error (old indexes)
E11000 duplicate key error: metricoolId_1

// Missing required fields (model mismatch)
Path `stock_number` is required

// API rate limiting
429 Too Many Requests

// Post not found
404 Post does not exist
```

### Solutions

- **Index cleanup** after model changes
- **Field mapping** between camelCase (API) and snake_case (DB)
- **Graceful degradation** for API failures
- **404 handling** in refresh operations

## Dashboard Integration

### Calendar View Working

✅ Posts appear in Metricool calendar
✅ Correct dates and times displayed  
✅ Draft status visible
✅ Click-through to edit works

### What Staff Can Do

- **AI text enhancement** using Metricool's tools
- **Platform-specific optimization**
- **Media management and alt text**
- **Scheduling and publishing**
- **Analytics and performance tracking**

## Testing Results

### Successful Test Cases

```
Campaign 171001 → 2 posts created (different dates/content)
Campaign 21001  → 2 posts created (different dates/content)

All posts visible in Metricool dashboard
All posts stored correctly in database
Proper linking via stock_number
```

### Data Quality

- ✅ Complete metadata preservation
- ✅ Platform-specific settings included
- ✅ Creator information tracked
- ✅ Media and alt text handling
- ✅ Timezone handling (America/Chicago)

## Production Deployment

### Environment Variables

```env
# Required for API access
METRICOOL_API_TOKEN=your_production_token
METRICOOL_USER_ID=production_user_id
METRICOOL_BLOG_ID=production_blog_id

# Database collections
social_campaigns     # Campaign data
metricool_posts     # Metricool post tracking
```

### Database Indexes

```javascript
// MetricoolPosts indexes
metricool_id_1; // Unique post identifier
stock_number_1; // Campaign linking
status_1; // Status filtering
publish_date_1; // Date sorting
created_at_1; // Chronological order
```

### Monitoring Points

- **API response times** (usually 500-1000ms)
- **Post creation success rate** (should be >95%)
- **Dashboard sync accuracy** (refresh operation health)
- **Database consistency** (metricool_id uniqueness)

## Future Enhancements

### Immediate Opportunities

1. **Webhook integration** for real-time status updates
2. **Bulk operations** for multiple post management
3. **Template system** for common post types
4. **Analytics integration** to track performance

### Advanced Features

1. **Campaign propagation** - Update all posts when campaign changes
2. **Scheduling suggestions** - AI-powered optimal posting times
3. **Performance optimization** - A/B testing different content
4. **Multi-campaign posting** - Cross-promote related inventory

---

**Last Updated**: October 16, 2025  
**API Version**: v2 (scheduler/posts endpoint)  
**Integration Status**: ✅ Production Ready
