# TKI Social Media Workflow Documentation

## Overview

The TKI Social Media platform enables staff to create, manage, and distribute social media content for inventory listings across multiple platforms (Facebook, LinkedIn, X/Twitter, Instagram) using Metricool integration.

**Platform Reference**: This application also serves as a reference platform for social media APIs (Meta, LinkedIn, etc.) requiring verification of web application sources for API access and Graph posting capabilities.

## Domain Architecture

- **`social.tonkaintl.com`** - Main social media management frontend (this application)
- **`socialapi.tonkaintl.com`** - Social media API backend (Express/TypeScript)
- **`tonkaintl.com`** - Main inventory website
- **`blog.tonkaintl.com`** - Squarespace blog/CMS (RSS integration available)

## System Architecture

```
TKI Binder (Staff Action)
    ↓ (API Call)
TKI Binder API
    ↓ (Webhook/Call)
TKI Social API (Normalize & Store)
    ↓ (Deep Link/Redirect)
TKI Social Frontend (Manage & Launch)
    ↓ (API Calls)
Metricool (Schedule & Publish)
    ↓ (Status Updates)
Social Platforms (Manual Push)
    ↓ (Webhooks)
Webhook Hub (N8N, Meta, Social Platforms)
    ↓ (RSS/Data)
Blog CMS (blog.tonkaintl.com)
```

### Database

- **New Database**: `tki-social` (separate from tki-binder and tki-portal)
- **Media Storage**: Azure Storage Account for images/videos
- **Status Tracking**: Metricool IDs and custom status management

## Workflow Steps

### 1. Content Creation Trigger

**Location**: TKI Binder (Staff Interface)
**Action**: Staff member clicks "Create Social Campaign" for a listing
**Result**:

- Triggers call to `tki-binder-api`
- Binder API calls `tki-social-api` to normalize and store listing data
- Returns link to social management interface

### 2. Data Normalization & Storage

**Location**: TKI Social API
**Process**:

- Receives listing data from binder API
- Normalizes content for each platform (Facebook, LinkedIn, X, Instagram)
- Stores in `social_campaigns` collection with status `pending`
- Returns deep link to social interface

### 3. Campaign Management

**Location**: TKI Social Frontend (`social.tonkaintl.com`)
**Features**:

- **List View** (`/social/listings`): MUI DataGrid with search, filter, pagination, sorting
- **Detail View** (`/social/listings/{stockNumber}`): Platform-specific cards with deep linking
- **Preview Tool** (`/test-api`): Validate listing data completeness before creating campaigns
- **Documentation** (`/api-docs`): Simple API overview for platform verification
- **About Page** (`/about`): Platform reference information for social media APIs
- **Actions**: Copy content, draft to Metricool, direct platform sharing, manual push, email sharing

### 4. Platform Distribution

**Options per Platform**:

- **Facebook**: Direct share link + Metricool draft + Manual push
- **LinkedIn**: Direct share link + Metricool draft + Manual push
- **X (Twitter)**: Tweet intent link + Metricool draft + Manual push
- **Instagram**: Metricool draft + Manual push (no direct sharing)
- **Email**: Send formatted content via email
- **Copy Options**: Copy as HTML, JSON, or plain text

## Data Models

### Social Campaign

```typescript
type SocialCampaign = {
  stockNumber: string;
  title: string;
  description: string;
  url: string;
  shortUrl?: string;
  media: { type: 'image' | 'video'; url: string }[];

  // Platform-specific normalized content
  platforms: {
    facebook: PlatformContent;
    linkedin: PlatformContent;
    x: PlatformContent;
    instagram: PlatformContent;
  };

  // Metadata
  status: 'pending' | 'draft' | 'scheduled' | 'published';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;

  // Post tracking
  posts: SocialPost[];

  // Media storage
  mediaStorage: 'azure'; // Azure Storage Account
  mediaUrls: string[]; // Azure blob URLs
};

type PlatformContent = {
  caption: string;
  hashtags: string[];
  media: { url: string; azureBlobUrl: string }[];
  utm: string;
  shareUrl?: string; // For direct platform sharing
  htmlPreview?: string; // For copy as HTML
};

type SocialPost = {
  platform: Platform;
  metricoolId?: string; // ID returned from Metricool API
  metricoolStatus?: 'draft' | 'scheduled' | 'published' | 'failed'; // From Metricool
  internalStatus:
    | 'created'
    | 'drafted'
    | 'scheduled'
    | 'published'
    | 'failed'
    | 'manual_push';
  scheduledDate?: Date;
  publishedDate?: Date;
  externalId?: string; // Platform-specific post ID
  lastStatusCheck?: Date; // When we last checked Metricool status
};
```

## API Endpoints (`socialapi.tonkaintl.com`)

### Public Endpoints (No Authentication)

- `GET /` - API health check and basic info
- `GET /docs` - Simple API documentation for platform verification
- `GET /v1/health` - Service health status
- `GET /v1/about` - Platform information for social media API verification

### Campaign Management (Bearer Token Required)

- `GET /v1/campaigns` - List campaigns with search, filter, sort, pagination
- `GET /v1/campaigns/{stockNumber}` - Get campaign details
- `POST /v1/campaigns/normalize` - Create/update campaign from binder data
- `GET /v1/campaigns/{stockNumber}/preview` - Validate data completeness

### Metricool Integration (Bearer Token Required)

- `POST /v1/campaigns/{stockNumber}/draft` - Draft to Metricool (returns metricoolId)
- `POST /v1/campaigns/{stockNumber}/bulk-draft` - Draft to multiple platforms
- `GET /v1/campaigns/{stockNumber}/metricool-status` - Sync status from Metricool API
- `PUT /v1/campaigns/{stockNumber}/status` - Update internal status

### Platform Actions (Bearer Token Required)

- `GET /v1/campaigns/{stockNumber}/share-urls` - Get direct sharing URLs
- `POST /v1/campaigns/{stockNumber}/manual-push` - Mark as manually pushed
- `POST /v1/campaigns/{stockNumber}/email` - Send content via email

### Content Export (Bearer Token Required)

- `GET /v1/campaigns/{stockNumber}/export` - Export as HTML, JSON, or text
- `GET /v1/campaigns/{stockNumber}/copy` - Get clipboard-ready content

### Webhook Endpoints (Public with Secret Validation)

- `POST /webhooks/metricool` - Metricool status updates
- `POST /webhooks/n8n` - N8N automation triggers
- `POST /webhooks/meta` - Meta/Facebook form submissions and updates
- `POST /webhooks/social/{platform}` - General social platform webhooks
- `GET /webhooks/blog/rss` - Pull blog.tonkaintl.com RSS feed

## User Experience Flow

1. **Staff creates campaign** in TKI Binder
2. **System normalizes** content and redirects to social interface
3. **Staff reviews** platform-specific content in card layout
4. **Staff takes action**:
   - **Copy**: Copy as HTML, JSON, or plain text to clipboard
   - **Draft**: Send to Metricool scheduler (tracks returned ID)
   - **Share**: Open direct platform sharing (where supported)
   - **Manual Push**: Mark as manually posted to platform
   - **Email**: Send formatted content via email
   - **Bulk Draft**: Send to all platforms at once
   - **Preview**: Validate data completeness before posting

## Security & Access

### Frontend Security (`social.tonkaintl.com`)

- **Authentication**: Microsoft Entra ID (Azure AD) for staff access
- **Authorization**: Role-based access (staff only)
- **Public Pages**: API docs and About page for platform verification
- **CORS**: Restricted to `tonkaintl.com` and `blog.tonkaintl.com`

### API Security (`socialapi.tonkaintl.com`)

- **Public Endpoints**: Health, docs, about (for platform verification)
- **Bearer Token**: Required for all campaign and action endpoints
- **Webhook Security**: Secret validation for all webhook endpoints
- **Internal Secrets**: Additional header validation for binder API calls
- **Rate Limiting**: Applied to all endpoints

## Platform-Specific Behaviors

### Facebook

- **Direct Share**: `https://www.facebook.com/sharer/sharer.php?u={url+utm}`
- **Metricool**: Full posting capability
- **Media**: Images and videos supported

### LinkedIn

- **Direct Share**: `https://www.linkedin.com/sharing/share-offsite/?url={url+utm}`
- **Metricool**: Company page posting
- **Media**: Images and videos supported

### X (Twitter)

- **Direct Share**: `https://twitter.com/intent/tweet?text={caption}&url={url+utm}`
- **Metricool**: Full posting capability
- **Media**: Images and videos supported
- **Character Limits**: Caption truncated to fit limits

### Instagram

- **Direct Share**: Not available (Instagram restrictions)
- **Metricool**: Business account posting only
- **Media**: Images and videos required

## Technical Considerations

## Webhook Integration Hub

The social platform serves as a central webhook hub for various automation and integration needs:

### Metricool Webhooks

- **Status Updates**: Real-time post status changes (draft → scheduled → published)
- **Engagement Data**: Like, share, comment notifications
- **Error Notifications**: Failed post alerts

### N8N Automation Webhooks

- **Campaign Triggers**: Trigger workflows when campaigns are created
- **Status Changes**: Notify external systems of post status updates
- **Data Extraction**: Pull campaign data for reporting/analytics

### Social Platform Webhooks

- **Meta/Facebook**: Form submissions, page updates, engagement events
- **LinkedIn**: Company page activity, engagement metrics
- **X/Twitter**: Mention notifications, engagement data
- **Instagram**: Media uploads, story updates

### Blog Integration

- **RSS Feed**: Pull content from `blog.tonkaintl.com` Squarespace site
- **Content Sync**: Sync blog posts for social media distribution
- **Cross-Platform**: Share blog content across social platforms

### Webhook Security

- **Secret Validation**: All webhooks validate signature/secret headers
- **Rate Limiting**: Prevent webhook abuse
- **Logging**: Full webhook activity logging for debugging
- **Retry Logic**: Failed webhook delivery retry mechanism

## UI/UX Design

### Material UI Components

- **DataGrid**: Campaign listing with search, filter, sort, pagination
- **Cards**: Platform-specific content cards with actions
- **Dialogs**: Confirmation dialogs for actions
- **Snackbars**: Success/error notifications
- **Forms**: Campaign creation and editing forms
- **Tables**: Status tracking and analytics displays

### Performance

- **Caching**: Platform content cached for 30 minutes
- **Pagination**: Campaign list paginated for large datasets
- **Image Optimization**: Media URLs optimized for each platform
- **Lazy Loading**: Platform cards load content on demand

### Error Handling

- **Simple Error Returns**: Display error messages with manual retry buttons (no automatic retry)
- **Metricool API Failures**: Show error and allow user to retry manually
- **Platform API Failures**: Graceful degradation (hide non-working buttons)
- **Data Validation**: Preview tool validates listing completeness before campaign creation

### Monitoring

- **Campaign Creation**: Log all new campaigns
- **Post Success/Failure**: Track Metricool integration success rates
- **User Actions**: Analytics on most-used platforms and features

## Setup Requirements

### Metricool Account

- **Account Setup**: Create Metricool business account
- **API Access**: Obtain API token and team ID
- **Platform Connections**: Connect Facebook, LinkedIn, X, Instagram accounts
- **Webhook Setup**: Configure status update webhooks (optional)

### Azure Storage

- **Media Storage**: Configure Azure Storage Account for images/videos
- **CDN Setup**: Optional CDN for faster media delivery
- **Access Policies**: Configure blob access policies

## Platform Verification & Reference

### For Social Media API Access

This platform serves as a verifiable web application for social media platform API access:

**Meta/Facebook Graph API**:

- Public documentation at `social.tonkaintl.com/api-docs`
- About page with company information at `social.tonkaintl.com/about`
- Privacy policy and terms of service (to be added)
- Verified domain ownership

**LinkedIn Company API**:

- Company profile integration
- Public API documentation
- Verified business application

**X/Twitter API**:

- Developer application reference
- Public webhook endpoints
- Terms of service compliance

## Future Enhancements

- **Analytics Dashboard**: Post performance tracking across platforms
- **Advanced Scheduling**: Custom scheduling beyond Metricool capabilities
- **Template System**: Reusable content templates with variable substitution
- **Bulk Operations**: Multi-campaign management and batch operations
- **A/B Testing**: Multiple caption variations with performance tracking
- **Direct Platform APIs**: Bypass Metricool for specific use cases
- **Advanced Webhooks**: Custom webhook routing and transformation
- **Blog Integration**: Automated blog-to-social content distribution
- **N8N Workflows**: Visual automation builder integration
- **Advanced Copy Options**: Rich text formatting, custom export templates
- **Mobile App**: React Native companion app for mobile management

## Environment Variables

```env
# Database (New separate database)
MONGODB_URI=mongodb://localhost:27017/tki-social

# Metricool Integration (Setup required)
METRICOOL_TOKEN=your_metricool_api_token
METRICOOL_TEAM=your_team_id
METRICOOL_WEBHOOK_SECRET=your_webhook_secret

# Azure Storage (For media files)
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection_string
AZURE_STORAGE_CONTAINER=social-media-assets

# Security
INTERNAL_SECRET=your_internal_api_secret
ALLOWED_ORIGINS=https://tonkaintl.com,https://blog.tonkaintl.com

# URLs & Domains
BINDER_API_URL=https://api.tonkaintl.com
SOCIAL_FRONTEND_URL=https://social.tonkaintl.com
SOCIAL_API_URL=https://socialapi.tonkaintl.com
MAIN_SITE_URL=https://tonkaintl.com
BLOG_URL=https://blog.tonkaintl.com
BLOG_RSS_URL=https://blog.tonkaintl.com/rss

# Bearer Token Authentication
API_BEARER_TOKEN=your_api_bearer_token
WEBHOOK_SECRET=your_webhook_secret

# Email (For email sharing feature)
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# N8N Integration
N8N_WEBHOOK_URL=your_n8n_webhook_url
N8N_API_KEY=your_n8n_api_key

# Platform API Keys (for direct integration)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

## Development Setup

See individual README files in:

- `/apps/socialapi` - Express/TypeScript API
- `/apps/tonkaintl` - React Frontend (current project)

---

_Last Updated: October 2025_
_Version: 1.0_
