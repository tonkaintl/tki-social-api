# Adapter Pattern Guide

## Overview

This project uses the **Adapter Pattern** to provide a consistent interface for interacting with different external services (social media platforms, databases, etc.) while hiding the implementation details and API differences behind a common abstraction.

## Core Concept

The adapter pattern consists of three key components:

1. **Base Type/Interface** - Defines the contract that all adapters must implement
2. **Adapter** - Implements the business logic and orchestrates calls to the client
3. **Client** - Handles HTTP requests and authentication with the external API
4. **Normalizer** (optional) - Transforms external API responses into our standard format

---

## Social Media Adapters

### Base: `adapter.types.js`

**Location:** `src/adapters/adapter.types.js`

**Purpose:** Defines the `SocialAdapter` base class that all social media adapters extend.

**Key Methods:**

- `createPost(input)` - Create a new post on the platform
- `createComment(input)` - Add a comment to an existing post
- `fetchPosts(input)` - Retrieve posts from the platform
- `handleWebhook(req)` - Process incoming webhook events
- `validateConfig()` - Verify required credentials are present

**Standard Types:**

- `CreatePostInput` - { pageIdOrHandle, message, linkUrl?, mediaUrls?, tags?, utm? }
- `CreatePostResult` - { externalPostId, permalink, status, raw? }
- `NormalizedPost` - { id, message, createdAt, permalink, authorId, authorName, likeCount?, ... }
- `NormalizedEvent` - { id, type, timestamp, postId, authorId, content, raw? }

---

## Platform Implementations

### Meta (Facebook)

**Folder:** `src/adapters/meta/`

#### `meta.adapter.js`

- Extends `SocialAdapter`
- Orchestrates Graph API operations
- Handles post creation with media attachments
- Processes Facebook webhooks for comments, messages, leads
- Validates page access tokens

#### `meta.graph.client.js`

- HTTP client for Facebook Graph API v18.0
- Handles authentication via page access token
- Implements retry logic with exponential backoff
- Methods: `get()`, `post()`

#### `meta.normalize.js`

- `normalizeMetaPost()` - Converts Graph API post format to `NormalizedPost`
- `normalizeMetaWebhookEvent()` - Converts webhook payloads to `NormalizedEvent`
- Handles feed events, conversations, and lead generation events

**Key Features:**

- Photo/video attachment support
- UTM parameter tracking
- Real-time webhooks for comments and messages

---

### LinkedIn

**Folder:** `src/adapters/linkedin/`

#### `linkedin.adapter.js`

- Extends `SocialAdapter`
- Uses LinkedIn UGC (User Generated Content) API
- Creates posts and comments on personal profiles or company pages
- Note: LinkedIn webhooks are limited and require special approval

#### `linkedin.client.js`

- HTTP client for LinkedIn API v2
- OAuth 2.0 Bearer token authentication
- REST.li protocol version headers
- Methods: `get()`, `post()`, `getCurrentUser()`, `getUserOrganizations()`

#### `linkedin.normalize.js`

- `normalizeLinkedInPost()` - Converts UGC post to `NormalizedPost`
- `normalizeLinkedInComment()` - Converts comment to standard format
- Extracts engagement metrics (likes, comments, shares)

**Key Features:**

- Organization/company page posting
- Author URN handling
- Limited webhook support (most integrations use polling)

---

### X (Twitter)

**Folder:** `src/adapters/x/`

#### `x.adapter.js`

- Extends `SocialAdapter`
- **Status:** Stubbed implementation (TODO)
- Will use Twitter API v2
- Character limits and threading differ from other platforms

#### `x.client.js`

- **Status:** Not implemented
- Will handle OAuth 2.0 Bearer Token or OAuth 1.0a
- Base URL: `https://api.twitter.com/2`

#### `x.normalize.js`

- **Status:** Not implemented
- Will convert tweet format to `NormalizedPost`
- Must handle retweets, quote tweets, threads

**Key Features (Planned):**

- 280 character limit handling
- Tweet threading
- Media uploads
- Filtered stream for webhooks

---

### Reddit

**Folder:** `src/adapters/reddit/`

#### `reddit.adapter.js`

- Extends `SocialAdapter`
- **Status:** Stubbed implementation (TODO)
- Will use Reddit OAuth 2.0 API
- Must handle subreddit-specific rules and karma requirements

#### `reddit.client.js`

- **Status:** Not implemented
- OAuth 2.0 authentication
- Base URL: `https://oauth.reddit.com`

#### `reddit.normalize.js`

- **Status:** Not implemented
- Will convert Reddit post format to `NormalizedPost`
- Must handle upvotes/downvotes, awards, subreddit context

**Key Features (Planned):**

- Text, link, and image post types
- Subreddit targeting
- Karma and account age requirements
- Polling-based updates (Reddit has no traditional webhooks)

---

## File Structure Convention

For each adapter, follow this structure:

```
src/adapters/
  adapter.types.js              # Base class for all adapters
  {provider}/
    {provider}.adapter.js       # Main adapter implementing SocialAdapter
    {provider}.client.js        # HTTP client for provider's API
    {provider}.normalize.js     # Response transformers
```

**Naming Convention:**

- Adapter class: `{Provider}Adapter` (e.g., `MetaAdapter`, `LinkedInAdapter`)
- Client class: `{Provider}Client` (e.g., `MetaGraphClient`, `LinkedInClient`)
- Normalizer functions: `normalize{Provider}Post()`, `normalize{Provider}WebhookEvent()`

---

## Implementation Checklist

When creating a new adapter:

### 1. Create Base Type (if new category)

- [ ] Define base class with required methods
- [ ] Document input/output types with JSDoc
- [ ] Define normalized data structures

### 2. Create Adapter

- [ ] Extend base class
- [ ] Implement all required methods
- [ ] Add provider-specific business logic
- [ ] Handle errors gracefully
- [ ] Add logging with consistent format

### 3. Create Client

- [ ] Implement HTTP methods (`get`, `post`, etc.)
- [ ] Handle authentication (Bearer, OAuth, API key)
- [ ] Add retry logic for transient failures
- [ ] Log requests with sanitized credentials

### 4. Create Normalizer

- [ ] Transform API responses to standard format
- [ ] Handle missing/optional fields gracefully
- [ ] Preserve raw data for debugging
- [ ] Document provider-specific quirks

### 5. Testing

- [ ] Mock the client in tests
- [ ] Test adapter business logic
- [ ] Test normalizer transformations
- [ ] Test error handling paths

---

## Benefits of This Pattern

1. **Consistency** - All providers have the same interface
2. **Testability** - Easy to mock clients and test adapters in isolation
3. **Maintainability** - Provider changes are isolated to their folder
4. **Extensibility** - Adding new providers follows a clear template
5. **Debugging** - Normalized data format makes cross-platform comparison easy

---

## Data Source Adapters: Binder

### Base: `adapter.types.js` (shared with social adapters)

Data source adapters fetch content that will be posted to social platforms. They follow the same pattern as social adapters.

### Binder (Equipment Inventory Database)

**Folder:** `src/adapters/binder/`

#### `binder.adapter.js`

- Main orchestrator for inventory data
- Fetches items by stock number
- Normalizes database fields to standard format
- Returns structured item data for formatters

#### `binder.client.js`

- MongoDB connection handler
- Query methods for items collection
- Connection pooling and error handling
- Lazy initialization pattern

#### `binder.normalize.js`

- `normalizeBinderItem()` - Transforms snake_case DB fields to camelCase
- Handles optional/missing fields
- Provides consistent item structure

**Standard Item Format:**

```javascript
{
  stockNumber: string,
  make: string,
  model: string,
  year: number,
  condition: string,
  hours: number,
  location: string,
  price: number,
  serialNumber: string,
  description: string,
  images: string[],
  category: string,
  status: string
}
```

---

## Content Formatters (Platform-Specific)

Each social platform needs to know how to format content from different data sources. Formatters live **inside the platform folder**.

### Structure

```
src/adapters/meta/
  meta.adapter.js
  meta.client.js
  meta.normalize.js
  formatters/
    binder-item.formatter.js    # Format Item → Meta post text

src/adapters/linkedin/
  linkedin.adapter.js
  linkedin.client.js
  linkedin.normalize.js
  formatters/
    binder-item.formatter.js    # Format Item → LinkedIn post text

src/adapters/x/
  x.adapter.js
  x.client.js
  x.normalize.js
  formatters/
    binder-item.formatter.js    # Format Item → X tweet text

src/adapters/reddit/
  reddit.adapter.js
  reddit.client.js
  reddit.normalize.js
  formatters/
    binder-item.formatter.js    # Format Item → Reddit post text
```

### Why Formatters Live in Platform Folders

1. **Platform Knowledge** - Each platform knows its character limits, hashtag conventions, emoji usage
2. **Scalability** - Easy to add new content sources (portal events, blog posts, etc.)
3. **Single Responsibility** - Binder fetches data, platforms handle formatting and posting
4. **Discoverability** - All Meta-related code lives together

### Formatter Interface

Each formatter exports a function that transforms source data into platform-ready text:

```javascript
// meta/formatters/binder-item.formatter.js
export function formatBinderItemForMeta(item) {
  // Returns formatted post text for Facebook
}

// linkedin/formatters/binder-item.formatter.js
export function formatBinderItemForLinkedIn(item) {
  // Returns formatted post text for LinkedIn
}
```

---

## API Endpoints

### Preview Endpoint: GET /api/inventory/item

Preview formatted content without posting to social media.

**Query Parameters:**

- `stockNumber` (required) - Equipment stock number
- `provider` (required) - Social platform: `meta`, `linkedin`, `x`, `reddit`

**Example:**

```
GET /api/inventory/item?stockNumber=21001&provider=meta
```

**Response:**

```json
{
  "stockNumber": "21001",
  "provider": "meta",
  "formattedContent": "🚜 2020 John Deere 8345R\n\n📋 Stock #21001...",
  "item": { ... }
}
```

### Post Endpoint: POST /api/social/post-item

Fetch equipment and post directly to social media platform.

**Body:**

```json
{
  "stockNumber": "21001",
  "provider": "meta",
  "pageIdOrHandle": "optional-page-id",
  "mediaUrls": ["https://..."],
  "utm": { "source": "api", "medium": "social" }
}
```

**Response:**

```json
{
  "externalPostId": "123456789",
  "permalink": "https://facebook.com/...",
  "status": "success"
}
```

---

## Data Flow Examples

### Flow 1: Preview Content (Read-Only)

```javascript
// GET /api/inventory/item?stockNumber=21001&provider=meta

// 1. Fetch item from Binder
const binderAdapter = new BinderAdapter(config);
const item = await binderAdapter.getItem('21001');
// Returns: { stockNumber, make, model, year, ... }

// 2. Format for the provider
const metaAdapter = new MetaAdapter(config);
const formatted = formatBinderItemForMeta(item);
// Returns: formatted text string

// 3. Return preview
return { stockNumber, provider, formattedContent: formatted, item };
```

### Flow 2: Post to Social Media

```javascript
// POST /api/social/post-item

// 1. Fetch item from Binder
const binderAdapter = new BinderAdapter(config);
const item = await binderAdapter.getItem(stockNumber);

// 2. Format and post to platform
const metaAdapter = new MetaAdapter(config);
const result = await metaAdapter.createPostFromItem(item, options);
// Internally: formats with binder-item.formatter.js + posts via client
// Returns: { externalPostId, permalink, status }

// 3. Return result
return result;
```

This architecture keeps data fetching, formatting, and publishing cleanly separated.
