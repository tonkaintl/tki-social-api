# Railway Server Settings — tki-social-api

> Last updated: March 2026

---

## tki-social-api Service

### Live URL

`https://tki-social-api-production.up.railway.app`

Custom domain not yet configured (see TODO below).

### Project Details

| Field       | Value                                                         |
| ----------- | ------------------------------------------------------------- |
| Project     | `tki-binder-api`                                              |
| Environment | `production`                                                  |
| Service     | `tki-social-api`                                              |
| Project ID  | `f1cd2484-28ab-42fd-b34e-2e94b5b30c77`                        |
| Service ID  | `78ffe2b3-2621-41a7-b0df-da92364983d9`                        |
| Live URL    | `https://tki-social-api-production.up.railway.app`            |
| Health URL  | `https://tki-social-api-production.up.railway.app/api/health` |
| Runtime     | Node 22.x                                                     |

### Deploy Status

- Initial deployment: ✅ done via `railway up` (March 2026)
- Git-based auto-deploy: ⬜ **TODO** — connect `main` branch in Railway dashboard (Service → Settings → Source)
- Once wired: push to `main` triggers automatic redeploy

### CLI Quick Commands

```powershell
# Link to this service
railway link --project f1cd2484-28ab-42fd-b34e-2e94b5b30c77 --environment production --service tki-social-api

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

All vars from `env.js` schema are set. Run `railway variable list` to audit.
Key vars confirmed set: `MONGODB_TKISOCIAL_URI`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `BINDER_API_URL`, `NODE_ENV=production`.

Social platform vars missing (not in local .env — add when needed):
`INSTAGRAM_*`, `THREADS_*`, `TIKTOK_*`, `X_*`, `YOUTUBE_*`

### TODO

- [ ] Connect GitHub repo `tonkaintl/tki-social-api` `main` branch to this Railway service (Railway dashboard → Service → Settings → Source)
- [ ] Add custom domain (e.g. `social-api.tkibinder.com`) once Git deploy is wired
- [ ] Update `PORTAL_API_URL` and `PORTAL_INTERNAL_SECRET` once portal API Railway URL is known
- [ ] Add social platform credentials as they become active

### Smoke URLs

- Health: `https://tki-social-api-production.up.railway.app/api/health`

---

## tki-binder-api Service (reference — separate repo)

The `tki-binder-api` service runs in the same Railway project and is the main binder/inventory API.

| Field      | Value                                              |
| ---------- | -------------------------------------------------- |
| Service    | `tki-binder-api`                                   |
| Service ID | `08d04aa8-76d0-4627-9e2e-1404eaa7c0fd`             |
| Live URL   | `https://tki-binder-api-production.up.railway.app` |
| Custom URL | `https://api.tkibinder.com`                        |

Custom domain SSL notes:
- DNS: CNAME in Cloudflare pointing at Railway hostname
- **Cloudflare proxy must be OFF (grey cloud / DNS-only)** — Railway handles SSL via Let's Encrypt
