# Platform Content Controller Usage

## Endpoint

```
PATCH /api/social/campaigns/:campaignId/platform-content
```

## Purpose

Update platform-specific comments and content for a campaign by stock number.

## Request Body Examples

### 1. Simple Platform Comments

```json
{
  "platform_content": [
    {
      "platform": "linkedin",
      "comment": "Excited to share our latest innovation with the professional community! #B2B #Innovation",
      "enabled": true
    },
    {
      "platform": "meta",
      "comment": "🎉 Our newest product is here! Perfect for families and individuals. #NewProduct #Lifestyle",
      "enabled": true
    },
    {
      "platform": "x",
      "comment": "Just dropped! 🔥 You're going to love this. #ProductLaunch",
      "enabled": true
    },
    {
      "platform": "reddit",
      "comment": "Hey r/ProductHunts! We just launched something pretty cool...",
      "enabled": false
    }
  ]
}
```

### 2. With Custom Text and Scheduling

```json
{
  "platform_content": [
    {
      "platform": "linkedin",
      "comment": "Professional update for our B2B audience",
      "custom_text": "Announcing our enterprise solution launch",
      "enabled": true,
      "scheduled_date": "2025-10-17T09:00:00Z"
    },
    {
      "platform": "meta",
      "comment": "Fun update for our consumer audience! 🎉",
      "custom_text": "Check out our amazing new consumer product!",
      "enabled": true,
      "scheduled_date": "2025-10-17T19:00:00Z"
    }
  ]
}
```

## Response

```json
{
  "data": {
    "platform_content": [
      {
        "platform": "linkedin",
        "comment": "Excited to share our latest innovation!",
        "enabled": true,
        "scheduled_date": "2025-10-17T09:00:00.000Z"
      }
    ],
    "stock_number": "TEST-001",
    "title": "Campaign Title",
    "updated_at": "2025-10-16T15:30:00.000Z"
  },
  "message": "Platform content updated successfully",
  "success": true
}
```

## Key Features

✅ **Validation**: Uses Zod schema with SUPPORTED_PROVIDERS enum  
✅ **Lookup**: Finds campaign by stock_number parameter  
✅ **Date Conversion**: Automatically converts ISO date strings to Date objects  
✅ **Error Handling**: Comprehensive error responses with logging  
✅ **Optional Fields**: All platform content fields are optional except platform  
✅ **Array Updates**: Completely replaces the platform_content array

## cURL Example

```bash
curl -X PATCH "http://localhost:3000/api/social/campaigns/TEST-001/platform-content" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform_content": [
      {
        "platform": "linkedin",
        "comment": "Professional LinkedIn post comment",
        "enabled": true
      },
      {
        "platform": "meta",
        "comment": "Casual Facebook/Instagram comment with emojis! 🎉",
        "enabled": true
      }
    ]
  }'
```

## Validation Rules

- `platform`: Must be one of: 'linkedin', 'meta', 'reddit', 'x'
- `comment`: Optional string
- `custom_text`: Optional string
- `enabled`: Optional boolean (defaults to true)
- `scheduled_date`: Optional ISO datetime string or Date object
