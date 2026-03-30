# Railway Server Settings — tki-social-api

> Last updated: March 2026

---

## tki-social-api Service

### Live URL

`https://tki-social-api-production-9291.up.railway.app`

Custom domain not yet configured (see TODO below).

### Project Details

| Field       | Value                                                              |
| ----------- | ------------------------------------------------------------------ |
| Project     | `public-apis`                                                      |
| Environment | `production`                                                       |
| Service     | `tki-social-api`                                                   |
| Project ID  | `ea60d93c-23fa-4fe4-a52b-e59068c6e9da`                             |
| Service ID  | `145e490d-5854-40e0-bdda-6275e4d0206a`                             |
| Live URL    | `https://tki-social-api-production-9291.up.railway.app`            |
| Health URL  | `https://tki-social-api-production-9291.up.railway.app/api/health` |
| Runtime     | Node 22.x                                                          |

### Deploy Status

- Initial deployment: ✅ done via `railway up` (March 2026)
- Git-based auto-deploy: ⬜ **TODO** — connect `main` branch in Railway dashboard (Service → Settings → Source)
- Once wired: push to `main` triggers automatic redeploy

### CLI Quick Commands

```powershell
# Link to this service
railway link --project ea60d93c-23fa-4fe4-a52b-e59068c6e9da --environment production --service tki-social-api

railway status
railway logs
railway variables
railway redeploy
```

### Deploy Behavior

- Build system: Nixpacks (auto-detected)
- Install step: `npm ci`
- Start command: `npm start` → `node src/server.js`
- Port: Railway injects `PORT`
- Variable change triggers automatic redeploy

### Env Vars Set

All vars from `env.js` schema are set (29 total). Run `railway variable list` to audit.
Key vars confirmed set: `MONGODB_TKISOCIAL_URI`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `BINDER_API_URL`, `NODE_ENV=production`.

Social platform vars missing (not in local .env — add when credentials are provisioned):
`INSTAGRAM_*`, `THREADS_*`, `TIKTOK_*`, `X_*`, `YOUTUBE_*`, `METRICOOL_TEAM_ID`

### Health Check (set in Railway dashboard)

- Path: `/api/health`
- Expected response: `{"service":"tki-social-api","status":"healthy"}`

### TODO

- [ ] Delete old `tki-social-api` service from the `tki-binder-api` project — **must be done via Railway dashboard**:
  - URL: `https://railway.com/project/f1cd2484-28ab-42fd-b34e-2e94b5b30c77`
  - Navigate to `tki-social-api` service → Settings → scroll to bottom → Delete Service
- [ ] Connect GitHub repo `tonkaintl/tki-social-api` `main` branch to this Railway service
  - Railway dashboard → `public-apis` project → `tki-social-api` service → Settings → Source
- [ ] Set Health Check Path to `/api/health` in Railway service settings
- [ ] Add custom domain (e.g. `social-api.tkibinder.com`) once Git deploy is wired
  - DNS: CNAME pointing at Railway hostname, Cloudflare proxy **OFF** (grey cloud / DNS-only)
- [ ] Update `PORTAL_API_URL` and `PORTAL_INTERNAL_SECRET` once portal API is deployed to Railway
- [ ] Add social platform credentials as they become active: `INSTAGRAM_*`, `THREADS_*`, `TIKTOK_*`, `X_*`, `YOUTUBE_*`

### Smoke URLs

- Health: `https://tki-social-api-production-9291.up.railway.app/api/health`

---

## Railway Project Topology (reference)

Based on `RAILWAY_PROJECT_SERVICE_TOPOLOGY.md`:

| Project        | Services                                          | Status         |
| -------------- | ------------------------------------------------- | -------------- |
| `public-apis`  | tki-social-api, tki-portal-api, tki-beehiv-api   | social-api ✅  |
| `private-apis` | tki-binder-api, tki-priority-one-api             | binder ✅      |
| `workers-jobs` | various background workers/functions             | ⬜ not created |

---

## tki-binder-api Service (reference — separate repo)

The `tki-binder-api` service runs in the `private-apis` Railway project.

| Field      | Value                                              |
| ---------- | -------------------------------------------------- |
| Project    | `private-apis`                                     |
| Service    | `tki-binder-api`                                   |
| Service ID | `08d04aa8-76d0-4627-9e2e-1404eaa7c0fd`             |
| Live URL   | `https://tki-binder-api-production.up.railway.app` |
| Custom URL | `https://api.tkibinder.com`                        |

Custom domain SSL notes:

- DNS: CNAME in Cloudflare pointing at Railway hostname
- **Cloudflare proxy must be OFF (grey cloud / DNS-only)** — Railway handles SSL via Let's Encrypt
