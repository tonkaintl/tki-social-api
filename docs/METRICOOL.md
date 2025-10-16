# Metricool Integration Guide

## Overview

Metricool serves as the **unified social media distribution engine** for TKI Social. Instead of managing individual APIs for Facebook, LinkedIn, X, Instagram, etc., we use one Metricool API to handle posting across all platforms.

**Core Value**: Your normalized listing data becomes fuel → Metricool distributes it everywhere → Staff can customize with AI → Posts get scheduled/published.

## What Metricool Provides

### Dashboard Features

- Unified analytics across all social platforms
- Manual post scheduling interface
- AI text generator for content optimization
- Cross-platform engagement tracking

### API Layer (What We Use)

- Programmatic post creation and scheduling
- Handles all per-platform OAuth tokens internally
- Single API for multi-platform distribution
- Draft creation for human review workflow

## Supported Platforms

| Platform               | Type              | Capabilities                  | Notes            |
| ---------------------- | ----------------- | ----------------------------- | ---------------- |
| **Facebook**           | Page, Group       | Full scheduling, media, links | Primary target   |
| **LinkedIn**           | Company, Personal | Text, links, images           | Business focus   |
| **X (Twitter)**        | Profile           | Text, images, threads         | Character limits |
| **Instagram**          | Business only     | Images, carousels, reels      | Visual content   |
| **TikTok**             | Business API      | Video uploads                 | Beta support     |
| **Google My Business** | Posts             | Local business posts          | Location-based   |
| **Pinterest**          | Pins              | Image + link posts            | Visual discovery |

## API Access & Authentication

### Requirements

- **Plan**: Advanced or Custom plan required for API access
- **Access**: Request API access through Metricool support
- **Credentials**: API token provided after approval

### API Endpoints

```
Base URL: https://app.metricool.com/api
Authentication: X-Mc-Auth header with API token
Content-Type: application/json
```

**✅ TESTED & VERIFIED** - Connection working as of Oct 2025

| Endpoint      | Method | Purpose                             |
| ------------- | ------ | ----------------------------------- |
| `/posts`      | POST   | Create draft or scheduled post      |
| `/posts`      | GET    | List existing posts                 |
| `/posts/{id}` | DELETE | Delete specific post                |
| `/networks`   | GET    | Get connected social accounts       |
| `/reports`    | GET    | Pull analytics and engagement stats |

## Integration Workflow

### 1. User-Initiated Flow (Primary)

```
Listing Page (/social/listings/42000)
    ↓ User clicks "Draft to Metricool"
API Call (socialapi.tonkaintl.com)
    ↓ Creates draft via Metricool API
Metricool Planner Opens
    ↓ Staff uses AI to customize content
    ↓ Staff schedules or publishes
Post Goes Live on Platforms
```

### 2. Direct Scheduling Flow (Secondary)

```
Listing Page
    ↓ User clicks "Schedule Now"
API Call with specific date/time
    ↓ Creates scheduled post via Metricool API
Post Automatically Publishes
    ↓ Status updates via webhook (optional)
Campaign Status Updated
```

## Post Creation Process

### Draft Creation (Recommended)

**Purpose**: Create post in Metricool for human review and AI customization

**API Call**:

```json
POST /posts
{
  "user_id": "4189470",
  "network": "facebook",
  "text": "2020 Kenworth T880 — one-owner, ready to go. #TonkaIntl #HeavyEquipment",
  "media": [
    {
      "url": "https://cdn.tonkaintl.com/listings/42000-1.jpg",
      "type": "image"
    }
  ],
  "publish_datetime": "2026-01-01T12:00:00Z",  // Far future = draft mode
  "status": "pending"
}
```

**Response**:

```json
{
  "id": "post_12345",
  "status": "pending",
  "network": "facebook",
  "publish_date": "2026-01-01T12:00:00Z",
  "created_at": "2025-10-14T10:30:00Z"
}
```

### Scheduled Creation (Direct Schedule)

**Purpose**: Schedule post for specific date/time without human review

**API Call**: Same as draft, but with real target time:

```json
POST /posts
{
  "user_id": "4189470",
  "network": "facebook",
  "text": "(same content)",
  "media": [...],
  "publish_datetime": "2025-10-14T15:30:00Z", // Real target time
  "status": "scheduled"
}
```

### Converting Draft to Scheduled

**Purpose**: Take existing draft and schedule it for publishing

**API Call**:

```json
PATCH /posts/{post_id}
{
  "publish_datetime": "2025-10-14T15:30:00Z", // Target publish time
  "status": "scheduled"
}
```

**Or to publish immediately**:

```json
PATCH /posts/{post_id}
{
  "publish_datetime": "2025-10-14T10:32:00Z" // 2 minutes from now
}
```

## Human-in-the-Loop Workflow

### The "Customize in Metricool" Flow

1. **System Creates Draft**: API creates draft post with normalized content
2. **User Reviews**: Staff opens Metricool Planner in new tab
3. **AI Enhancement**: Staff uses Metricool's AI text generator to optimize copy
4. **Final Review**: Staff previews across platforms
5. **Schedule/Publish**: Staff sets timing or publishes immediately

### Benefits of This Approach

- ✅ **Speed**: Automated draft creation from normalized data
- ✅ **Quality**: Human review with AI assistance
- ✅ **Safety**: No accidental posts without review
- ✅ **Flexibility**: Platform-specific customization available
- ✅ **Analytics**: Full tracking in Metricool dashboard

### Post Status Verification

**Purpose**: Check post status and verify scheduling

**API Call**:

```json
GET /posts?status=scheduled
GET /posts?status=pending
GET /posts?status=published
GET /posts/{post_id}
```

**Response**:

```json
{
  "id": "post_12345",
  "status": "scheduled",
  "network": "facebook",
  "publish_datetime": "2025-10-14T15:30:00Z",
  "text": "...",
  "created_at": "2025-10-14T10:30:00Z"
}
```

## Platform-Specific Considerations

### Facebook

- **Media**: Images, videos, carousels supported
- **Links**: Link previews automatically generated
- **Character Limits**: Flexible, but optimize for engagement

### LinkedIn

- **Focus**: Professional tone and business context
- **Media**: Images perform well, videos supported
- **Links**: Link posts get good visibility

### X (Twitter)

- **Character Limits**: 280 characters (system should truncate/optimize)
- **Threads**: Multiple posts can be chained
- **Media**: Images, GIFs, videos supported

### Instagram

- **Media Required**: All posts need images or videos
- **Hashtags**: Up to 30 hashtags, strategic placement important
- **Stories**: Separate API endpoints available

## Security & Best Practices

### API Security

- **Server-Side Only**: Never expose Metricool tokens to frontend
- **Proxy Pattern**: Frontend → Your API → Metricool API
- **Token Management**: Store securely in environment variables
- **Rate Limiting**: Respect Metricool's API limits

### Content Safety

- **Draft Mode**: Default to drafts for review
- **UTM Tracking**: Always include proper UTM parameters
- **Media Validation**: Ensure all media URLs are accessible
- **Platform Compliance**: Follow each platform's content guidelines

## Error Handling

### Common API Errors

- **401 Unauthorized**: Invalid API token or team_id
- **400 Bad Request**: Missing required fields or invalid data
- **429 Rate Limited**: Too many requests, implement backoff
- **500 Server Error**: Metricool service issues, retry later

### Fallback Strategies

- **Draft Creation Fails**: Show error, allow manual retry
- **Media Upload Issues**: Validate URLs before API call
- **Platform Disconnected**: Inform user to reconnect in Metricool
- **Scheduling Conflicts**: Suggest alternative times

## Status Tracking & Webhooks

### Post Status Lifecycle

**Metricool API Status**:

1. **pending** - Created but not scheduled (draft equivalent)
2. **scheduled** - Queued for future publishing
3. **processing** - Currently being published to platforms
4. **published** - Successfully live on social platforms
5. **failed** - Publishing attempt failed
6. **deleted** - Removed from queue

**TKI Campaign Status Mapping**:

```javascript
const STATUS_MAPPING = {
  pending: 'draft', // Internal draft state
  scheduled: 'scheduled', // Approved and queued
  processing: 'publishing', // In progress
  published: 'active', // Live and successful
  failed: 'failed', // Publishing failed
  deleted: 'cancelled', // Cancelled by user
};
```

### Webhook Integration (Optional)

Metricool can send webhooks for status changes:

```json
POST /webhooks/metricool
{
  "post_id": "abc123",
  "status": "published",
  "platform": "facebook_page",
  "published_at": "2025-10-14T15:30:00Z"
}
```

## Implementation Checklist

### Setup Phase

- [ ] Sign up for Metricool Pro/Team plan
- [ ] Request API access from Metricool support
- [ ] Connect all target social media accounts
- [ ] Test API credentials with simple post creation
- [ ] Configure webhook endpoints (optional)

### Development Phase

- [ ] Implement server-side proxy endpoints
- [ ] Add draft creation functionality
- [ ] Build status tracking system
- [ ] Test error handling scenarios
- [ ] Implement retry logic for failed posts

### Production Phase

- [ ] Configure production API credentials
- [ ] Set up monitoring for API health
- [ ] Train staff on Metricool Planner workflow
- [ ] Document troubleshooting procedures
- [ ] Monitor post success rates and performance

## Measuring Success

### Key Metrics

- **Draft Creation Rate**: How many listings become social posts
- **Customization Rate**: Percentage of drafts edited before publishing
- **Publishing Success**: Percentage of scheduled posts that publish successfully
- **Platform Performance**: Engagement rates per platform
- **Staff Efficiency**: Time from listing to published post

### Analytics Sources

- **Metricool Dashboard**: Cross-platform analytics and engagement
- **Internal Tracking**: Campaign creation and completion rates
- **Platform Native**: Deep dive analytics from each social platform
- **UTM Analytics**: Traffic attribution back to inventory pages

---

_This integration transforms social media posting from a manual, multi-platform chore into a streamlined, AI-enhanced workflow that scales with inventory volume._
