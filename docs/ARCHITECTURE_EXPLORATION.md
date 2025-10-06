# TKI Social API - Architecture Exploration

This document captures our current thinking and open questions about the TKI Social API architecture. This is **exploratory work** - not final decisions.

## The Problem We're Solving

**Context:** TKI Binder is a complex ERP system. Social media platforms (Meta, LinkedIn, X, Reddit) have their own quirks and complexities.

**Question:** How do we connect these without making a mess?

## Current Thinking: Separate Service

**Why a separate service might make sense:**

- Binder team knows business logic, not social media APIs
- Social team can focus on platform quirks
- Clean separation of concerns

**Why it might not:**

- Adds complexity (more services to deploy/maintain)
- Network calls between services
- Could just be over-engineering

## The Data Flow Question (UNRESOLVED)

This is the big architectural question we're still figuring out:

### Option 1: Dumb Forwarder

```
Social Platform → TKI Social API → Forward everything to Binder
```

**Pros:** Simple, no local storage needed
**Cons:** Inefficient, lots of unnecessary API calls, tight coupling

### Option 2: Smart Processor

```
Social Platform → TKI Social API → Process/filter → Send business events to Binder
```

**Pros:** Efficient, loose coupling, adds real value
**Cons:** Need local database, more complex

**Current status:** We have MongoDB connection tests working, but haven't decided which approach to take.

## What We've Built So Far

### Working Components

- ✅ **Express server** with comprehensive middleware stack
- ✅ **Production-ready routing** using controller/methods pattern
- ✅ **Meta adapter** (functional Facebook posting)
- ✅ **Binder service** (full API integration with comprehensive tests)
- ✅ **Portal service** (full API integration with comprehensive tests)
- ✅ **Database connections** (both TKI Portal and Binder MongoDB)
- ✅ **Webhook security** (signature verification for Meta & LinkedIn)
- ✅ **Comprehensive test suite** (30 tests across 4 files)
- ✅ **Production utilities** (logging, idempotency, graceful shutdown)
- ✅ **Azure-ready deployment** configuration

### Stub Components

- 🔄 LinkedIn, X, Reddit adapters (placeholder code)
- 🔄 Webhook handlers for X, Reddit (basic structure)

## Open Questions

### 1. Data Processing Strategy

- **Should TKI Social store and process social data locally?**
- Or just forward everything to Binder immediately?
- What's the right balance between efficiency and simplicity?

### 2. Database Usage

- We have MongoDB connections working, but what should we store?
- Raw webhook data? Processed events? Just tokens and cache?
- Or go database-free and keep it stateless?

### 3. Webhook Handling

- How much processing should happen in webhook handlers?
- Store first, then process async? Or process immediately?
- What gets sent to Binder and when?

### 4. Service Boundaries

- What belongs in TKI Social vs TKI Binder?
- Where's the line between "social platform stuff" and "business logic"?

## Current Code Structure

```
src/
├── controllers/              # Clean controller/methods pattern
│   ├── social/
│   │   ├── methods.js       # Index export for all social methods
│   │   └── methods/
│   │       ├── social.controller.post.create.js      # POST /social/post
│   │       ├── social.controller.comment.create.js   # POST /social/comment
│   │       └── social.controller.fetch.posts.js      # GET /social/fetch
│   └── webhooks/
│       ├── methods.js       # Index export for all webhook methods
│       └── methods/
│           ├── webhooks.controller.meta.handle.js    # Meta webhook handler
│           ├── webhooks.controller.meta.verify.js    # Meta signature verification
│           ├── webhooks.controller.linkedin.handle.js # LinkedIn webhook handler
│           └── webhooks.controller.linkedin.verify.js # LinkedIn signature verification
├── routes/
│   ├── index.js             # Main router setup
│   ├── social.routes.js     # Social API routes with auth & rate limiting
│   └── webhooks.routes.js   # Webhook routes with signature verification
├── adapters/                # Platform-specific logic
│   ├── meta/               # ✅ Working Facebook integration
│   ├── linkedin/           # 🔄 Stub (with normalize functions)
│   ├── x/                  # 🔄 Stub
│   └── reddit/             # 🔄 Stub
├── services/
│   ├── binder.service.js   # ✅ Production API integration
│   └── portal.service.js   # ✅ Production API integration
├── middleware/
│   ├── auth.internal.js    # Internal secret authentication
│   ├── error.handler.js    # Global error handling
│   ├── rateLimit.js        # Request rate limiting
│   └── requestId.js        # Request ID tracking
├── utils/
│   ├── logger.js           # ✅ Structured logging with pino
│   ├── idempotencyStore.js # ✅ Prevents duplicate posts
│   └── mapping.js          # ✅ Data transformation utilities
├── config/
│   ├── env.js              # ✅ Environment validation with Zod
│   └── database.js         # ✅ MongoDB connection with retry
├── tests/                  # Comprehensive test suite (30 tests)
│   ├── postToSocial.spec.js        # ✅ Integration tests (main API)
│   ├── binder.service.spec.js      # ✅ Unit tests (Binder service)
│   ├── portal.service.spec.js      # ✅ Unit tests (Portal service)
│   └── database.connection.spec.js # ✅ Infrastructure tests (DB connections)
├── app.js                  # Express app configuration
└── server.js               # ✅ Azure-ready server with graceful shutdown
```

## Next Steps to Explore

1. **Try the smart processor approach**
   - Build a simple webhook handler that stores data locally
   - Process it and send filtered results to Binder
   - See how it feels vs the dumb forwarder approach

2. **Define the service boundary**
   - What types of data/events should stay in TKI Social?
   - What should be immediately sent to Binder?

3. **Build one complete flow**
   - Pick one social platform webhook (like Meta comment)
   - Implement it end-to-end both ways
   - See which approach makes more sense

## Production-Ready Features

### ✅ **Routing Architecture**

- **Pattern:** Controller/methods structure for clean separation
- **Authentication:** Internal secret-based auth for service-to-service calls
- **Rate Limiting:** Request throttling to prevent abuse
- **Error Handling:** Consistent error responses across all endpoints

### ✅ **Security Implementation**

- **Webhook Verification:** Platform-specific signature validation
  - Meta: `x-hub-signature-256` with SHA256-HMAC
  - LinkedIn: `x-li-signature-sha256` with SHA256-HMAC
- **Internal Auth:** `x-internal-secret` header for API access
- **Input Validation:** Zod schema validation for all requests

### ✅ **Testing Strategy**

- **Integration Tests:** Full API request/response testing (`postToSocial.spec.js`)
- **Unit Tests:** Service-level testing with mocked dependencies
- **Infrastructure Tests:** Database connectivity validation
- **30 tests total** running in ~3 seconds with `npm test`

### ✅ **Operational Excellence**

- **Structured Logging:** Pino with development pretty-printing
- **Graceful Shutdown:** SIGTERM/SIGINT handling for Azure deployments
- **Idempotency:** Prevents duplicate social posts with TTL cache
- **Environment Config:** Zod-validated environment variables
- **Azure Ready:** Port configuration, logging, and shutdown handling

### ✅ **Utility Functions**

- **Data Transformation:** Object cleaning, UTM parameter handling
- **Error Formatting:** Consistent error response structure
- **URL Manipulation:** Safe URL parameter appending
- **Async Utilities:** Sleep, jitter for backoff strategies

## Notes and Decisions

_This section will capture decisions as we make them, with reasoning_

- **Database connections:** Added MongoDB URIs and connection tests (Oct 6, 2025)
- **Reason:** Want to explore the "smart processor" approach, need database option available

- **Controller restructuring:** Moved to methods/ pattern (Oct 6, 2025)
- **Reason:** User's established pattern for clean separation of concerns

- **Removed over-engineering:** Eliminated cache service, simplified responses (Oct 6, 2025)
- **Reason:** 2-user system doesn't need complex caching, prefer simplicity

- **Added webhook security:** Implemented signature verification (Oct 6, 2025)
- **Reason:** Production security requirement for webhook authenticity

- **Comprehensive testing:** Added service tests, kept integration tests (Oct 6, 2025)
- **Reason:** Good for learning different test patterns, catches different issue types
