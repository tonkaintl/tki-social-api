# 🔥 TKI Social API - Frontend Integration Guide

## 🚀 **Post-Refactoring Update (January 2025)**

**Inventory Structure Completely Removed**: All functionality is now properly organized under the campaign management system. No more confusing terminology!

## 🎯 **Three Different Workflows Available**

### **1. 👀 Campaign Preview (Single Stock + Single Platform)**

**Use Case**: "Show me how this binder data would look as a social post on Facebook"

- **Endpoint**: `GET /api/social/campaigns/:stockNumber/preview/:provider`
- **Auth**: `Authorization: Bearer <msal-token>` header
- **Path Params**: `stockNumber` and `provider` are both part of the URL
- **Returns**: Formatted content only (no database storage)
- **Perfect for**: Preview before deciding to create campaign

```javascript
// Example Request
GET /api/social/campaigns/TKI2024001/preview/meta
Headers: { "Authorization": "Bearer <msal-token>" }

// Example Response
{
  "success": true,
  "stockNumber": "TKI2024001",
  "provider": "meta",
  "binderData": { /* raw binder API data */ },
  "formattedForPlatform": {
    "message": "🚗 2024 Toyota Camry - Perfect blend of style...",
    "hashtags": ["#Toyota", "#Camry", "#NewCar"],
    "media": [{ "url": "...", "type": "image" }]
  },
  "requestId": "uuid-here"
}
```

---

### **2. 📋 Campaign Management (Full Database Workflow)**

**Use Case**: "Create and manage a marketing campaign for this vehicle"

#### **Create Campaign**

- **Endpoint**: `POST /api/social/campaigns`
- **Auth**: `Authorization: Bearer <msal-token>` header
- **Returns**: Full campaign record stored in database

```javascript
// Example Request
POST /api/social/campaigns
Headers: { "Authorization": "Bearer <msal-token>" }
Body: {
  "stockNumber": "TKI2024001",
  "platforms": ["meta", "linkedin"],
  "scheduledFor": "2024-12-31T10:00:00Z",
  "priority": "high",
  "tags": ["test", "campaign"]
}

// Example Response
{
  "success": true,
  "data": {
    "_id": "campaign-uuid-here",
    "stockNumber": "TKI2024001",
    "platforms": ["meta", "linkedin"],
    "status": "draft",
    "scheduledFor": "2024-12-31T10:00:00Z",
    "priority": "high",
    "tags": ["test", "campaign"],
    "createdAt": "2024-01-15T...",
    "updatedAt": "2024-01-15T..."
  }
}
```

#### **List All Campaigns**

- **Endpoint**: `GET /api/social/campaigns`
- **Returns**: Array of all campaigns in database

#### **Get Specific Campaign**

- **Endpoint**: `GET /api/social/campaigns/:stockNumber`
- **Returns**: Single campaign by stock number

#### **Update Campaign**

- **Endpoint**: `PUT /api/social/campaigns/:stockNumber`
- **Body**: Updated campaign fields
- **Returns**: Updated campaign record

---

### **3. 🚀 Direct Social Posting (Immediate)**

**Use Case**: "Post this content to Facebook right now (bypass campaign system)"

- **Endpoint**: `POST /api/social/post`
- **Auth**: `Authorization: Bearer <msal-token>` header
- **Returns**: Platform response with post ID

```javascript
// Post with stock number (auto-formatted)
POST /api/social/post
Body: {
  "stockNumber": "TKI2024001",
  "platform": "meta"
}

// Post with custom content
POST /api/social/post
Body: {
  "platform": "meta",
  "content": {
    "text": "Check out this amazing vehicle!",
    "images": []
  }
}
```

---

## 🏗️ **Frontend Implementation Recommendations**

### **Page 1: Campaign Preview Tool**

```javascript
// Single campaign preview for validation
const previewCampaign = async (stockNumber, platform, token) => {
  const response = await fetch(
    `/api/social/campaigns/${stockNumber}/preview/${platform}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.json();
};
```

### **Page 2: Campaign Dashboard**

```javascript
// Create campaign
const createCampaign = async (campaignData, token) => {
  const response = await fetch('/api/social/campaigns', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      stockNumber: campaignData.stockNumber,
      platforms: campaignData.platforms,
      scheduledFor: campaignData.scheduledFor,
      priority: campaignData.priority,
      tags: campaignData.tags,
    }),
  });
  return response.json();
};

// List all campaigns
const listCampaigns = async token => {
  const response = await fetch('/api/social/campaigns', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};
```

### **Page 3: Direct Posting Tool**

```javascript
// Direct platform posting with stock number
const postFromStock = async (stockNumber, platform, token) => {
  const response = await fetch('/api/social/post', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stockNumber, platform }),
  });
  return response.json();
};

// Direct posting with custom content
const postCustomContent = async (platform, content, token) => {
  const response = await fetch('/api/social/post', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ platform, content }),
  });
  return response.json();
};
```

---

## 🎨 **UI/UX Flow Suggestions**

### **Option 1: Three Separate Pages**

1. **Preview Tool** (`/preview`) - Quick single previews
2. **Campaign Manager** (`/campaigns`) - Full campaign workflow
3. **Direct Poster** (`/post`) - Immediate posting

### **Option 2: Unified Workflow**

1. **Start with Preview** - User selects stock number, sees previews
2. **Create Campaign** - "Create Campaign" button → full workflow
3. **Post Options** - From campaign, can post to individual platforms

---

## 🔐 **Authentication**

All endpoints (except health checks) require `Authorization: Bearer` header with MSAL JWT token.

### **How to Pass the Token:**

**Header Format:**

```
Authorization: Bearer <JWT_TOKEN>
```

**Complete MSAL Integration Example:**

```javascript
// 1. Initialize MSAL instance
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: 'your-azure-app-client-id',
    authority: 'https://login.microsoftonline.com/your-tenant-id',
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

// 2. Login and get account
const loginRequest = {
  scopes: ['api://your-api-scope/access_as_user'],
};

try {
  const loginResponse = await msalInstance.loginPopup(loginRequest);
  const account = loginResponse.account;

  // 3. Get access token for API calls
  const tokenRequest = {
    scopes: ['api://your-api-scope/access_as_user'],
    account: account,
  };

  const tokenResponse = await msalInstance.acquireTokenSilent(tokenRequest);
  const accessToken = tokenResponse.accessToken;

  // 4. Use token in API calls
  const response = await fetch(
    '/api/social/campaigns/TKI2024001/preview/meta',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
} catch (error) {
  // Handle token acquisition errors
  if (error.name === 'InteractionRequiredAuthError') {
    // Token expired, get new one interactively
    const tokenResponse = await msalInstance.acquireTokenPopup(tokenRequest);
    const accessToken = tokenResponse.accessToken;
  }
}
```

### **Token Requirements:**

- **Format**: JWT (JSON Web Token)
- **Source**: Microsoft Authentication Library (MSAL)
- **Scope**: Must include the API scope for your TKI Social API
- **Header**: Must be passed as `Authorization: Bearer <token>`
- **Expiration**: Tokens expire - handle refresh automatically with MSAL

### **Common API Call Patterns:**

```javascript
// Reusable function to make authenticated API calls
const apiCall = async (url, options = {}) => {
  try {
    const tokenRequest = {
      scopes: ['api://your-api-scope/access_as_user'],
      account: msalInstance.getActiveAccount(),
    };

    const tokenResponse = await msalInstance.acquireTokenSilent(tokenRequest);

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${tokenResponse.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};

// Usage examples:
const preview = await apiCall('/api/social/campaigns/TKI2024001/preview/meta');
const campaigns = await apiCall('/api/social/campaigns');
const newCampaign = await apiCall('/api/social/campaigns', {
  method: 'POST',
  body: JSON.stringify({ stockNumber: 'TKI2024001', platforms: ['meta'] }),
});
```

---

## 📊 **Error Handling**

All endpoints return consistent error format:

```javascript
// 400 Validation Error
{
  "error": "Validation failed",
  "details": "Missing required field: stockNumber"
}

// 401 Unauthorized
{
  "error": "Unauthorized - Invalid or missing Authorization Bearer token"
}

// 404 Not Found
{
  "error": "Campaign not found",
  "stockNumber": "ABC123"
}

// 500 Server Error
{
  "error": "Internal server error",
  "message": "Binder API request failed"
}
```

---

## 🚀 **Ready to Start Frontend Development!**

The API provides three distinct workflows:

1. ✅ **Preview** - Single stock + single platform preview (`/api/social/campaigns/:stockNumber/preview/:provider`)
2. ✅ **Campaign Management** - Full database CRUD operations (`/api/social/campaigns`)
3. ✅ **Direct Posting** - Immediate platform posting (`/api/social/post`)

**Note**: The inventory structure has been completely removed for clarity. All functionality is now properly organized under the campaign system!

## 🧪 **Testing Made Easy**

Import the comprehensive Postman collection: `TKI-Social-API.postman_collection.json`

This includes 25+ organized test cases covering all workflows with proper authentication and validation tests.

Choose the workflow that best fits each frontend use case!
