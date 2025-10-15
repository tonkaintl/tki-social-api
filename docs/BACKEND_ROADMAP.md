# TKI Social API Backend Roadmap

## Target Architecture

**Domain**: `socialapi.tonkaintl.com`  
**Stack**: Node.js 20+ + Express + JavaScript + MongoDB  
**Database**: `tki-social` (new separate database)

## Architecture Philosophy

**Dynamic Content Generation**: Platform-specific content (Facebook, LinkedIn, X, Reddit, Instagram) is generated on-demand using formatters rather than stored in the database. This ensures:

- ✅ Always fresh content reflecting current Binder data
- ✅ Consistent formatting with latest formatter improvements
- ✅ Lean database storage (no duplicated formatted content)
- ✅ Single source of truth (Binder data)

**Media Portfolio Strategy**: Each campaign maintains a `mediaUrls` portfolio - a collection of user-uploaded images/videos available for social posting. Users can browse existing portfolio media in a dialog interface and add new assets as needed. Media is stored in Azure with CDN optimization.

## Project Structure

```
tki-social-api/
├── src/
│   ├── server.js               # Bootstrap, CORS, JSON, health
│   ├── app.js                  # Express app configuration
│   ├── routes/
│   │   ├── social.routes.js    # Social & Campaign CRUD operations
│   │   ├── health.routes.js    # Health check endpoints
│   │   └── webhooks.routes.js  # Webhook hub
│   ├── controllers/
│   │   └── social/
│   │       └── methods/        # Campaign & social controllers
│   ├── services/
│   │   ├── binder.service.js   # Binder API integration
│   │   ├── campaigns.service.js # Campaign business logic
│   │   └── portal.service.js   # Portal API client
│   ├── adapters/
│   │   ├── binder/             # Binder data normalization
│   │   ├── meta/               # Meta/Facebook integration
│   │   ├── linkedin/           # LinkedIn integration
│   │   ├── x/                  # X (Twitter) integration
│   │   └── reddit/             # Reddit integration
│   ├── middleware/
│   │   ├── auth.internal.js    # Internal secret validation
│   │   ├── auth.bearer.js      # Bearer token middleware
│   │   ├── rateLimit.js        # Rate limiting
│   │   └── error.handler.js    # Error handling
│   ├── models/
│   │   └── socialCampaigns.model.js # MongoDB campaign schema
│   ├── utils/
│   │   ├── logger.js           # Pino logging
│   │   └── mapping.js          # Utility functions
│   └── config/
│       ├── env.js              # Environment configuration
│       └── database.js         # MongoDB connection
├── package.json
├── eslint.config.js
├── vitest.config.js
└── README.md
```

## Current Progress Status

### ✅ Completed Features

**Core Infrastructure:**

- Express.js server with middleware (auth, rate limiting, logging, error handling)
- MongoDB integration with campaign model
- Environment configuration and validation
- OAuth2 Bearer token authentication
- Comprehensive test suite with Vitest
- ESLint + Prettier + perfectionist plugin code quality

**Platform Adapters & Formatters:**

- Meta/Facebook formatter (emoji-rich content)
- LinkedIn formatter (professional tone)
- X/Twitter formatter (concise, hashtag-optimized)
- Reddit formatter (markdown-style)
- All formatters tested and working with stock number 21001

**Campaign System:**

- Campaign preview endpoint (GET /api/social/campaigns/preview)
- Campaign creation endpoint (POST /api/social/campaigns)
- Campaign detail endpoint with dynamic formatting (GET /api/social/campaigns/:stockNumber)
- Campaign update endpoint for status changes (PUT /api/social/campaigns/:stockNumber)
- Dynamic content generation architecture (no stored platform content)

**Binder Integration:**

- Binder service client with authentication
- Data normalization and formatting
- Stock number validation
- Media URL handling

### 🚧 In Development

**Campaign Management:**

- Campaign listing with pagination and filtering (basic structure implemented)
- Campaign deletion endpoint (planned)

**Media Portfolio Management:**

- Media portfolio system (mediaUrls array per campaign)
- Azure Storage integration for user-uploaded media (planned)
- Portfolio dialog interface for browsing/selecting existing media (frontend)
- Add new media to campaign portfolio via upload interface (planned)
- Media optimization per platform (planned)

**Metricool Integration:**

- Draft creation API integration (planned)
- Status synchronization (planned)
- Bulk operations (planned)

### 📋 Future Phases

**Direct Posting:**

- Immediate posting endpoints
- Platform-specific posting logic
- Error handling and retry mechanisms

**Content Enhancement:**

- Share URL generation
- Export functionality (HTML/JSON/text)
- Email sharing
- Manual post tracking

**Analytics & Monitoring:**

- Performance metrics
- Usage analytics
- Health monitoring dashboard

## Core Type Definitions (`src/lib/types.ts`)

```javascript
export type Platform =
  | 'facebook_page'
  | 'linkedin_company'
  | 'x_profile'
  | 'instagram_business';

export type CampaignStatus =
  | 'pending'
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'failed';

export type PostStatus =
  | 'created'
  | 'drafted'
  | 'scheduled'
  | 'published'
  | 'failed'
  | 'manual_push';

export interface NormalizedListing {
  stockNumber: string;
  title: string;
  url: string;
  shortUrl?: string;
  media: { type: 'image' | 'video'; url: string; azureBlobUrl: string }[];
  caption: string;
  hashtags: string[];
  utm: string;
  specs?: Record<string, string | number>;
}

export interface PlatformContent {
  platform: Platform;
  caption: string;
  hashtags: string[];
  media: { url: string; azureBlobUrl: string }[];
  utm: string;
  shareUrl?: string;
  htmlPreview?: string;
  characterCount?: number;
}

// NOTE: PlatformContent is generated dynamically by formatters, not stored in database

export interface PostPayload {
  platform: Platform;
  text: string;
  media: { url: string }[];
  link?: string;
  publishDate?: string | null;
  stockNumber: string;
}

export interface Campaign {
  _id?: string;
  stockNumber: string;
  title: string;
  description?: string;
  url: string;
  shortUrl?: string;

  // Metadata
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;

  // Media Portfolio - user-curated collection for social posting
  mediaStorage: 'azure';
  mediaUrls: string[]; // Portfolio of available images/videos for this campaign

  // Dynamic fields (not stored, generated on-demand):
  // - platform_content: Generated by formatters from Binder data
  // - inventory_data: Fetched fresh from Binder service
}
```

## Environment Configuration

```env
# Database
MONGODB_URI=mongodb://localhost:27017/tki-social

# Server
PORT=8080
NODE_ENV=production

# Security & CORS
BEARER_TOKEN=your_api_bearer_token
INTERNAL_SECRET=your_internal_secret
ALLOWED_ORIGINS=https://social.tonkaintl.com,https://tonkaintl.com,https://blog.tonkaintl.com

# Metricool Integration
METRICOOL_TOKEN=your_metricool_api_token
METRICOOL_TEAM=your_team_id
METRICOOL_WEBHOOK_SECRET=your_webhook_secret

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=your_azure_connection_string
AZURE_STORAGE_CONTAINER=social-media-assets

# External Services
BINDER_API_URL=https://api.tonkaintl.com
BLOG_RSS_URL=https://blog.tonkaintl.com/rss

# Email (SMTP)
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# N8N Integration
N8N_WEBHOOK_URL=your_n8n_webhook_url
N8N_API_KEY=your_n8n_api_key

# Platform API Keys
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

## API Endpoints Implementation

### Public Endpoints (No Auth Required)

```javascript
// GET / - API health and info
// GET /docs - Simple API documentation
// GET /v1/health - Service health status
// GET /v1/about - Platform verification info
```

### Campaign Preview (Bearer Token Required)

```javascript
// GET /api/social/campaigns/preview - Preview campaign for specific platform
//   Query params: stockNumber, provider (meta|linkedin|x|reddit)
//   Returns: Formatted content without storing in database
//   Use case: Quick preview before creating campaign
```

### Campaign Management (Bearer Token Required)

```javascript
// POST /api/social/campaigns - Create campaign from binder data
// GET /api/social/campaigns - List campaigns with pagination, search, filter
// GET /api/social/campaigns/:stockNumber - Get campaign details with dynamic platform formatting
// PUT /api/social/campaigns/:stockNumber - Update campaign status/metadata
// DELETE /api/social/campaigns/:stockNumber - Delete campaign
```

### Media Portfolio Management (Bearer Token Required)

```javascript
// GET /api/social/campaigns/:stockNumber/media - Get campaign's media portfolio
// POST /api/social/campaigns/:stockNumber/media - Add media to campaign portfolio
//   Body: { mediaUrl, mediaType, azureBlobUrl? }
//   Returns: Updated portfolio array
// DELETE /api/social/campaigns/:stockNumber/media/:mediaId - Remove media from portfolio
// PUT /api/social/campaigns/:stockNumber/media/:mediaId - Update media metadata
//   Use case: User opens dialog to browse portfolio, adds new images as needed
```

### Metricool Integration (Bearer Token Required)

```javascript
// POST /v1/campaigns/:stockNumber/draft - Draft single platform
// POST /v1/campaigns/:stockNumber/bulk-draft - Draft multiple platforms
// GET /v1/campaigns/:stockNumber/metricool-status - Sync from Metricool
// PUT /v1/campaigns/:stockNumber/status - Update internal status
```

### Direct Social Media Posting (Bearer Token Required)

```javascript
// POST /api/social/post - Direct post to platforms (immediate posting)
//   Body: { message, pageIdOrHandle, provider/providers, additionalParams }
//   Returns: Platform response with post IDs and permalinks
//   Use case: Immediate posting without campaign workflow
```

### Content & Sharing (Bearer Token Required - Future)

```javascript
// GET /v1/campaigns/:stockNumber/share-urls - Platform sharing URLs
// GET /v1/campaigns/:stockNumber/export - Export as HTML/JSON/text
// POST /v1/campaigns/:stockNumber/email - Send via email
// POST /v1/campaigns/:stockNumber/manual-push - Mark manually posted
```

### Webhook Hub (Secret Validation Required)

```javascript
// POST /webhooks/metricool - Metricool status updates
// POST /webhooks/n8n - N8N automation triggers
// POST /webhooks/meta - Meta/Facebook events
// POST /webhooks/social/:platform - General platform webhooks
// GET /webhooks/blog/rss - Blog RSS integration
```

## Key Services Implementation

### Campaign Service (`src/services/campaigns.js`)

- CRUD operations with MongoDB
- Data validation and normalization
- Status tracking and updates
- Dynamic platform content generation via formatters

### Metricool Service (`src/services/metricool.ts`)

```javascript
class MetricoolService {
  async createPost(payload: PostPayload): Promise<{ id: string }>;
  async getPostStatus(postId: string): Promise<MetricoolStatus>;
  async listPosts(filter: any): Promise<MetricoolPost[]>;
  async deletePost(postId: string): Promise<void>;
}
```

### Normalization Service (`src/services/normalize.ts`)

- Platform-specific content shaping
- UTM parameter generation
- Hashtag optimization per platform
- Character limit handling
- Media optimization

### Storage Service (`src/services/storage.ts`)

- Azure Blob Storage integration
- Image/video upload handling
- CDN URL generation
- Media optimization per platform

## MongoDB Schema Design

### Campaign Collection

```javascript
const CampaignSchema = new Schema({
  stockNumber: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  url: { type: String, required: true },
  shortUrl: String,

  status: {
    type: String,
    enum: ['pending', 'draft', 'scheduled', 'published', 'failed'],
    default: 'pending',
    index: true,
  },

  mediaStorage: { type: String, default: 'azure' },
  mediaUrls: [String], // Media Portfolio: user-curated collection for social posting

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
});
```

## Security Implementation

### Authentication Middleware (`src/middleware/auth.ts`)

```javascript
export const requireBearerToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== process.env.BEARER_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};
```

### CORS Configuration (`src/lib/cors.ts`)

```javascript
export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
```

## Development & Deployment

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest",
    "lint": "eslint src/**/*.ts",
    "type-check": "tsc --noEmit"
  }
}
```

### Docker Configuration

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

## Integration Points

### TKI Binder Integration

- Webhook endpoint for campaign creation
- Data normalization from binder format
- Stock number validation
- Media URL resolution

### Metricool API Integration

- OAuth token management
- Post creation and scheduling
- Status synchronization
- Error handling and retry logic

### Azure Storage Integration

- Media file uploads
- CDN URL generation
- Image optimization
- Blob lifecycle management

---

_This backend roadmap provides a comprehensive API foundation for the social media campaign management system._
