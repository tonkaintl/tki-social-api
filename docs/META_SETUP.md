# Meta (Facebook) API Setup Guide

**Starting Point:** NOTHING IS IMPLEMENTED YET. This is your roadmap to build Meta integration from scratch.

## 🎯 North Star (What You're Building Toward)

A tiny service (tki-social-api) that can:

1. Post to your Facebook Page (as the Page)
2. Read your Page feed + engagement
3. Receive webhooks for comments/DMs/leads in real time
4. Fetch Lead Ads submissions and hand them to Binder
5. Never touch WhatsApp Cloud (you chose Twilio for WA/SMS)

## 🏁 You'll Know You're Done When...

- You can run one HTTP call to your service and it creates a post on the Page and returns `{externalPostId, permalink}`
- A test comment or DM on that post hits your webhook and you see it in Binder's "conversations"
- A Lead Ad submit shows up in Binder's "leads" within seconds (with consent text + ad/campaign IDs)
- Daily, you can fetch last N posts and store metrics (likes/comments/shares) for reporting

## 📋 Minimal Permissions to Request (App Review)

- `pages_manage_posts`
- `pages_read_engagement`
- `leads_retrieval`

(You're verified, so now they'll actually review these.)

## 🛠️ Build in This Order

### Milestone 1 — Page Posting (MVP, 1 file)

**Goal:** Prove auth + a write works.

**Build:**

- Your service exposes: `POST /social/post { provider:"meta", pageIdOrHandle, message, linkUrl? }`
- Under the hood: `POST /{PAGE_ID}/feed` with Page Access Token
- Output: `{ externalPostId, permalink, status:"success" }`

### Milestone 2 — Read Posts/Engagement

**Build:**

- `GET /social/fetch?provider=meta&pageIdOrHandle=...&limit=10`
- Under the hood: `GET /{PAGE_ID}/posts` (+ optional insights later)
- Save post IDs in Binder for cross-linking to conversations

### Milestone 3 — Webhooks (comments/DMs)

**Build:**

- Public endpoint: `POST /social/webhooks/meta` (+ `GET` verify)
- On comment/DM: normalize → `POST Binder /integrations/conversations/upsert`
- (include post_id, permalink, from, message, timestamp)

### Milestone 4 — Lead Ads → Binder

**Build:**

- Webhook fires with a leadgen_id
- Your service fetches full lead via Graph → normalize →
- `POST Binder /integrations/leads/upsert` with consent block (exact copy, timestamp, ad/adset/campaign IDs)
- (Optional) Trigger Binder's `/messages/send` for double opt-in SMS via Twilio

### Milestone 5 — Hardening (token + errors)

**Build:**

- Long-lived Page token, basic retry/backoff, idempotency on leadgen_id & comment_id, rate limiting, structured logs

## 🔧 The Only Endpoints You Really Need (Inside tki-social-api)

- `POST /social/post` → create a Page post
- `GET /social/fetch` → fetch recent Page posts
- `POST /social/webhooks/meta` → receive comments/DMs/leads (verify + events)
- (Optional) `POST /meta/lead/fetch` → exchange leadgen_id for full payload (used by your webhook)

**And calls into Binder:**

- `POST /integrations/leads/upsert`
- `POST /integrations/conversations/upsert`
- (Optional) `POST /messages/send` (Binder → Twilio gatekeeper)

## 📱 Facebook App Setup (Do This First)

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "Create App" → "Business"
3. **App Name:** `TKI Social API`
4. **Contact Email:** Your business email

### Step 2: Add Products & Request Permissions

**Products to add:**

- Facebook Login
- Webhooks

**Permissions to request:**

- `pages_manage_posts` - Post to Page
- `pages_read_engagement` - Read Page posts + metrics
- `leads_retrieval` - Access Lead Ad data

### Step 3: Get Your Credentials

**From App Dashboard:**

- App ID: [Copy from Basic Settings]
- App Secret: [Copy from Basic Settings]

**Generate Page Access Token:**

1. Graph API Explorer → Select your app
2. Generate token with required permissions
3. **Convert to long-lived:**

```bash
curl -X GET "https://graph.facebook.com/oauth/access_token" \
  -G \
  -d "grant_type=fb_exchange_token" \
  -d "client_id=YOUR_APP_ID" \
  -d "client_secret=YOUR_APP_SECRET" \
  -d "fb_exchange_token=YOUR_SHORT_TOKEN"
```

### Step 4: Environment Variables

Add to your `.env`:

```bash
META_APP_ID=your_facebook_app_id
META_APP_SECRET=your_facebook_app_secret
META_PAGE_ID=your_facebook_page_id
META_PAGE_ACCESS_TOKEN=your_long_lived_page_token
META_VERIFY_TOKEN=your_webhook_verify_token_choose_anything
```

## 🧪 Sanity Checks (Fast Manual Tests)

### Create a Post (After Milestone 1):

```bash
curl -X POST http://localhost:8080/social/post \
 -H "x-internal-secret: dev" -H "Content-Type: application/json" \
 -d '{"provider":"meta","pageIdOrHandle":"<PAGE_ID>",
      "message":"Hello from Tonka","linkUrl":"https://tonkaintl.com"}'
```

### Fetch Posts (After Milestone 2):

```bash
curl "http://localhost:8080/social/fetch?provider=meta&pageIdOrHandle=<PAGE_ID>&limit=3" \
 -H "x-internal-secret: dev"
```

### Webhook Verify (After Milestone 3):

Browser: `GET /social/webhooks/meta?hub.mode=subscribe&hub.verify_token=<yours>&hub.challenge=12345` → returns 12345

Then comment on the new post → confirm it hits your webhook → Binder gets `/conversations/upsert`

## 🚫 What to Ignore (Saves Weeks)

- **Groups API:** Effectively dead for automation; treat groups as manual posting surfaces
- **Marketplace posting:** Not a general API. Use Lead Ads + Catalog/Dynamic Ads later if you want remarketing
- **WhatsApp Cloud setup:** Skip; you're using Twilio WhatsApp under the same TCPA brain

## 🧠 One-Page Mental Model

- **Meta** is just a read/write + webhook surface for your Page and a lead faucet (Lead Ads)
- **tki-social-api** is the translator to Meta
- **Binder** stays the brain: stores people, consent, conversations, and decides if/when to message via Twilio

## 🚀 Ready to Start?

You're a noob at Meta stuff, but that's fine. The hard part isn't the Meta API - it's just getting the Facebook App setup right and understanding their permission model.

**Next step:** Set up your Facebook App and get those credentials. Then we tackle Milestone 1.
