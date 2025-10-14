# TKI Social API Backend Roadmap

## Target Architecture

**Domain**: `socialapi.tonkaintl.com`  
**Stack**: Node.js 20+ + Express + TypeScript + MongoDB  
**Database**: `tki-social` (new separate database)

## Project Structure

```
apps/socialapi/
├── src/
│   ├── index.ts                 # Bootstrap, CORS, JSON, health
│   ├── lib/
│   │   ├── cors.ts             # Allowlist based on ALLOWED_ORIGINS
│   │   ├── http.ts             # Typed helpers: ok, bad, error, traceId
│   │   ├── types.ts            # Shared types
│   │   └── auth.ts             # Bearer token validation
│   ├── routes/
│   │   ├── campaigns.ts        # Campaign CRUD operations
│   │   ├── metricool.ts        # Metricool integration
│   │   ├── webhooks.ts         # Webhook hub
│   │   └── public.ts           # Public endpoints (docs, health)
│   ├── services/
│   │   ├── campaigns.ts        # Campaign business logic
│   │   ├── metricool.ts        # Metricool API client
│   │   ├── normalize.ts        # Platform content normalization
│   │   └── storage.ts          # Azure Storage integration
│   ├── middleware/
│   │   ├── auth.ts             # Bearer token middleware
│   │   ├── cache.ts            # Cache headers
│   │   ├── cors.ts             # CORS middleware
│   │   └── validation.ts       # Request validation
│   └── models/
│       ├── Campaign.ts         # MongoDB campaign schema
│       └── Post.ts             # Social post tracking
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## Core Type Definitions (`src/lib/types.ts`)

```typescript
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

  // Platform-specific normalized content
  platforms: Record<Platform, PlatformContent>;

  // Metadata
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;

  // Media storage
  mediaStorage: 'azure';
  mediaUrls: string[];

  // Post tracking
  posts: SocialPost[];
}

export interface SocialPost {
  platform: Platform;
  metricoolId?: string;
  metricoolStatus?: 'draft' | 'scheduled' | 'published' | 'failed';
  internalStatus: PostStatus;
  scheduledDate?: Date;
  publishedDate?: Date;
  externalId?: string;
  lastStatusCheck?: Date;
  error?: string;
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

```typescript
// GET / - API health and info
// GET /docs - Simple API documentation
// GET /v1/health - Service health status
// GET /v1/about - Platform verification info
```

### Campaign Management (Bearer Token Required)

```typescript
// GET /v1/campaigns - List with pagination, search, filter
// GET /v1/campaigns/:stockNumber - Get campaign details
// POST /v1/campaigns/normalize - Create/update from binder data
// PUT /v1/campaigns/:stockNumber - Update campaign
// DELETE /v1/campaigns/:stockNumber - Delete campaign
// GET /v1/campaigns/:stockNumber/preview - Validate data completeness
```

### Metricool Integration (Bearer Token Required)

```typescript
// POST /v1/campaigns/:stockNumber/draft - Draft single platform
// POST /v1/campaigns/:stockNumber/bulk-draft - Draft multiple platforms
// GET /v1/campaigns/:stockNumber/metricool-status - Sync from Metricool
// PUT /v1/campaigns/:stockNumber/status - Update internal status
```

### Content & Sharing (Bearer Token Required)

```typescript
// GET /v1/campaigns/:stockNumber/share-urls - Platform sharing URLs
// GET /v1/campaigns/:stockNumber/export - Export as HTML/JSON/text
// POST /v1/campaigns/:stockNumber/email - Send via email
// POST /v1/campaigns/:stockNumber/manual-push - Mark manually posted
```

### Webhook Hub (Secret Validation Required)

```typescript
// POST /webhooks/metricool - Metricool status updates
// POST /webhooks/n8n - N8N automation triggers
// POST /webhooks/meta - Meta/Facebook events
// POST /webhooks/social/:platform - General platform webhooks
// GET /webhooks/blog/rss - Blog RSS integration
```

## Key Services Implementation

### Campaign Service (`src/services/campaigns.ts`)

- CRUD operations with MongoDB
- Data validation and normalization
- Platform-specific content generation
- Status tracking and updates

### Metricool Service (`src/services/metricool.ts`)

```typescript
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

```typescript
const CampaignSchema = new Schema({
  stockNumber: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  url: { type: String, required: true },
  shortUrl: String,

  platforms: {
    facebook_page: PlatformContentSchema,
    linkedin_company: PlatformContentSchema,
    x_profile: PlatformContentSchema,
    instagram_business: PlatformContentSchema,
  },

  status: {
    type: String,
    enum: ['pending', 'draft', 'scheduled', 'published', 'failed'],
    default: 'pending',
    index: true,
  },

  mediaStorage: { type: String, default: 'azure' },
  mediaUrls: [String],
  posts: [SocialPostSchema],

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
});
```

## Security Implementation

### Authentication Middleware (`src/middleware/auth.ts`)

```typescript
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

```typescript
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
