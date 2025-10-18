# Media Management Architecture

## Overview

The TKI Social API implements a two-tier media management system designed to provide flexibility in social media campaigns:

1. **Campaign Media Library** - A shared portfolio of media assets
2. **Proposed Posts Media** - Platform-specific media selection for actual posting

## Data Model Structure

### Campaign-Level Media (Library)

```javascript
{
  // Storage configuration
  media_storage: "azure", // Where media files are stored

  // Media portfolio/library
  media_urls: [
    {
      url: "required",
      alt: "string",
      description: "string",
      filename: "string",
      media_type: "image|video", // enum
      size: "number",
      tags: ["string"],
      created_at: "date"
    }
  ]
}
```

### Proposed Posts Media (Platform-Specific)

```javascript
{
  proposed_posts: [
    {
      platform: 'meta|linkedin|x|reddit', // enum
      enabled: true,
      text: 'Platform-specific content',
      scheduled_date: 'date',

      // Platform-specific media selection
      media_urls: [
        {
          url: 'required',
          alt: 'string',
          description: 'string',
          filename: 'string',
          media_type: 'image|video', // enum
          size: 'number',
          tags: ['string'],
        },
      ],
    },
  ];
}
```

## Current API Coverage

### Campaign Media Library (✅ Complete)

- `POST /campaigns/:stockNumber/media` - Add media to library
- `DELETE /campaigns/:stockNumber/media/:mediaIndex` - Remove from library

### Proposed Posts Management (✅ Partial)

- `PATCH /campaigns/:stockNumber/add-proposed-posts` - Add platforms
- `PATCH /campaigns/:stockNumber/update-proposed-posts` - Update text/scheduling
- `PATCH /campaigns/:stockNumber/delete-proposed-posts` - Remove platforms

### Proposed Posts Media (✅ Complete)

- `PATCH /campaigns/:stockNumber/proposed-posts/:platform/media` - Add media to platform
- `DELETE /campaigns/:stockNumber/proposed-posts/:platform/media/:mediaIndex` - Remove media
- `PUT /campaigns/:stockNumber/proposed-posts/:platform/media` - Replace all media

## Intended Workflow

1. **Build Library**: Users upload media to campaign library via `/media` endpoint
2. **Create Posts**: Users create proposed posts for platforms via `/add-proposed-posts`
3. **Curate Media**: Users select/assign media from library to specific platforms
4. **Post Content**: Metricool integration reads `proposed_posts[].media_urls` for actual posting

## Architecture Benefits

- **Separation of Concerns**: Library for storage, proposed posts for publishing
- **Platform Flexibility**: Different media per platform (Instagram vs LinkedIn needs)
- **Reusability**: Same library asset can be used across multiple platforms
- **Workflow Control**: Clear staging area before final publishing

## Implementation Status

- ✅ Campaign library management
- ✅ Proposed posts text/scheduling
- ✅ Proposed posts media assignment
- ✅ Metricool integration reads proposed posts media

## Complete API Endpoints

### Campaign Media Library

- `POST /campaigns/:stockNumber/media` - Add media to campaign library
- `DELETE /campaigns/:stockNumber/media/:mediaIndex` - Remove media from library

### Proposed Posts Management

- `PATCH /campaigns/:stockNumber/add-proposed-posts` - Add platforms to campaign
- `PATCH /campaigns/:stockNumber/update-proposed-posts` - Update text/scheduling
- `PATCH /campaigns/:stockNumber/delete-proposed-posts` - Remove platforms

### Proposed Posts Media Management

- `PATCH /campaigns/:stockNumber/proposed-posts/:platform/media` - Add single media item
- `DELETE /campaigns/:stockNumber/proposed-posts/:platform/media/:mediaIndex` - Remove specific media
- `PUT /campaigns/:stockNumber/proposed-posts/:platform/media` - **Replace all media** (Frontend bulk operation)

## Usage Examples

### Adding Media to Specific Platform

```javascript
PATCH /campaigns/ABC123/proposed-posts/meta/media
{
  "url": "https://storage.azure.com/image.jpg",
  "alt": "Product image",
  "media_type": "image"
}
```

### Replacing All Media for Platform (Frontend Bulk Operation)

```javascript
PUT /campaigns/ABC123/proposed-posts/linkedin/media
{
  "media_urls": [
    {
      "url": "https://storage.azure.com/image1.jpg",
      "alt": "Professional shot",
      "media_type": "image"
    },
    {
      "url": "https://storage.azure.com/image2.jpg",
      "alt": "Detail view",
      "media_type": "image"
    }
  ]
}
```

The workflow is now complete and production-ready!
