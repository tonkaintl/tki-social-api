# TKI Social API

A production-ready Node.js service that exposes a stable internal API for posting and fetching social content while hiding provider differences behind adapters.

## Features

- 🔌 **Modular Adapters**: Support for Meta (Facebook/Instagram), LinkedIn, X (Twitter), and Reddit
- 🔒 **Internal Authentication**: Secure access via `x-internal-secret` header
- 🚦 **Rate Limiting**: Configurable rate limits per endpoint and provider
- 📝 **Comprehensive Logging**: Structured logging with request correlation
- 🔄 **Retry Logic**: Exponential backoff with jitter for external API calls
- 🆔 **Idempotency**: Built-in idempotency support for post creation
- 🧪 **Testing**: Comprehensive test suite with Vitest
- 📊 **Monitoring**: Health checks and error tracking
- 🛡️ **Error Handling**: Consistent error responses across all endpoints

## Quick Start

### Prerequisites

- Node.js 22.x or higher
- npm 10.x or higher

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd tki-social-api
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
   - Set `INTERNAL_SECRET_KEY` for API authentication
   - Configure Meta credentials if using Meta adapter
   - Set `BINDER_API_URL` and `BINDER_INTERNAL_SECRET` for Binder integration

5. Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:8080`

## API Endpoints

### Health Check

```bash
GET /health
```

### Create Post (Single Provider)

```bash
curl -X POST http://localhost:8080/social/post \
  -H "x-internal-secret: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "meta",
    "pageIdOrHandle": "your-page-id",
    "message": "Hello from TKI Social API!",
    "linkUrl": "https://tonkaintl.com"
  }'
```

### Create Post (Multi-Provider)

```bash
curl -X POST http://localhost:8080/social/post \
  -H "x-internal-secret: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "providers": ["meta", "linkedin"],
    "pageIdOrHandle": "your-page-id",
    "message": "Multi-platform post!",
    "linkUrl": "https://tonkaintl.com"
  }'
```

### Create Comment

```bash
curl -X POST http://localhost:8080/social/comment \
  -H "x-internal-secret: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "meta",
    "threadIdOrPostId": "post-id",
    "message": "Great post!"
  }'
```

### Fetch Posts

```bash
curl "http://localhost:8080/social/fetch?provider=meta&pageIdOrHandle=your-page-id&limit=10" \
  -H "x-internal-secret: your-secret-key"
```

### Get Inventory Item (with Formatting)

```bash
# Get item as JSON
curl "http://localhost:8080/inventory/item?stockNumber=12345&format=json" \
  -H "x-internal-secret: your-secret-key"

# Get item formatted for social media
curl "http://localhost:8080/inventory/item?stockNumber=12345&format=social" \
  -H "x-internal-secret: your-secret-key"

# Get item as a summary
curl "http://localhost:8080/inventory/item?stockNumber=12345&format=summary" \
  -H "x-internal-secret: your-secret-key"
```

For detailed documentation on the Inventory API and formatter system, see [INVENTORY_API.md](docs/INVENTORY_API.md).

## Environment Variables

| Variable                 | Description                     | Required | Default                 |
| ------------------------ | ------------------------------- | -------- | ----------------------- |
| `PORT`                   | Server port                     | No       | `8080`                  |
| `INTERNAL_SECRET_KEY`    | Authentication secret           | Yes      | -                       |
| `META_APP_ID`            | Meta app ID                     | No       | -                       |
| `META_APP_SECRET`        | Meta app secret                 | No       | -                       |
| `META_PAGE_ID`           | Meta page ID                    | No       | -                       |
| `META_PAGE_ACCESS_TOKEN` | Meta page access token          | No       | -                       |
| `META_VERIFY_TOKEN`      | Meta webhook verification token | No       | `verify_me`             |
| `BINDER_API_URL`         | Binder service URL              | No       | `http://localhost:4000` |
| `BINDER_INTERNAL_SECRET` | Binder authentication secret    | Yes      | -                       |
| `LOG_LEVEL`              | Logging level                   | No       | `info`                  |
| `NODE_ENV`               | Environment                     | No       | `development`           |

## Provider Status

| Provider                  | Post Creation | Comments | Fetch Posts | Webhooks | Status          |
| ------------------------- | ------------- | -------- | ----------- | -------- | --------------- |
| Meta (Facebook/Instagram) | ✅            | ✅       | ✅          | ✅       | **Implemented** |
| LinkedIn                  | ⏳            | ⏳       | ⏳          | ❌       | **Stub**        |
| X (Twitter)               | ⏳            | ⏳       | ⏳          | ⏳       | **Stub**        |
| Reddit                    | ⏳            | ⏳       | ⏳          | ❌       | **Stub**        |

## Development

### Running Tests

```bash
npm test
```

### Linting and Formatting

```bash
npm run lint
npm run format
```

### Development Mode (with auto-reload)

```bash
npm run dev
```

## Architecture

### Directory Structure

```
src/
├── adapters/           # Provider-specific adapters
│   ├── adapter.types.js
│   ├── meta/          # Meta (Facebook/Instagram) adapter
│   ├── linkedin/      # LinkedIn adapter (stub)
│   ├── x/             # X (Twitter) adapter (stub)
│   └── reddit/        # Reddit adapter (stub)
├── config/            # Configuration management
├── constants/         # Application constants
├── middleware/        # Express middleware
├── routes/            # API route controllers
│   └── webhooks/      # Webhook handlers
├── services/          # External service integrations
├── utils/             # Utility functions
└── tests/             # Test files
```

### Adapter Pattern

All social media providers implement the same `SocialAdapter` interface:

```javascript
class SocialAdapter {
  async createPost(input)      // Create a new post
  async createComment(input)   // Create a comment/reply
  async fetchPosts(input)      // Fetch posts from provider
  async handleWebhook(req)     // Process webhook events
  async validateConfig()       // Validate adapter configuration
}
```

## Integration with Binder

This service integrates with the Binder system for:

- **Lead Management**: Webhook events create/update leads
- **Conversation Tracking**: Comments and messages are logged
- **Post Logging**: Successful posts are recorded
- **Message Routing**: Uses Binder's Twilio integration (never calls Twilio directly)

## Security

- **Internal Authentication**: All endpoints require `x-internal-secret` header
- **Rate Limiting**: Per-endpoint and per-provider limits
- **Input Validation**: Strict validation using Zod schemas
- **Error Handling**: No sensitive information leaked in error responses
- **Request Correlation**: Every request has a unique ID for tracing

## Monitoring

- **Health Checks**: `/health` endpoint for load balancer checks
- **Structured Logging**: JSON logs with correlation IDs
- **Error Tracking**: Comprehensive error logging and categorization
- **Performance Metrics**: Request timing and success rates

## Deployment

### Production Checklist

- [ ] Set secure `INTERNAL_SECRET_KEY`
- [ ] Configure production database connections
- [ ] Set up Redis for caching and idempotency (replace in-memory stores)
- [ ] Configure external monitoring and alerting
- [ ] Set up log aggregation
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Enable HTTPS
- [ ] Set appropriate rate limits for production traffic

### Environment-Specific Configuration

The service automatically detects the environment via `NODE_ENV`:

- **Development**: Pretty-printed logs, verbose error messages
- **Production**: JSON logs, sanitized error responses
- **Test**: In-memory stores, mocked external services

## Contributing

1. Follow the established adapter pattern for new providers
2. Include comprehensive tests for new features
3. Update documentation for API changes
4. Use conventional commit messages
5. Ensure all linting and formatting checks pass

## License

ISC License - See LICENSE file for details
