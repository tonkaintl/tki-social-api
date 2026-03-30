# Storage Migration TODO

This document is the working checklist for copying blob data from Azure Storage Accounts to Cloudflare R2 while preserving the same logical structure used by the apps.

## Goal

Mirror business-data blobs from Azure to R2 with:

- the same container-level separation
- the same blob key / filepath
- verification before cutover
- Azure left intact until reads are validated

Because records store `filepath` values instead of full Azure blob URLs, the migration can preserve exact object keys without a database rewrite.

## Source Containers To Migrate

Business data:

- `tonkasharestorage/tkibinder`
- `tonkasharestorage/tkisocial`
- `tonkasharestorage/tonkaintl`
- `tkiportalstorage/users`
- `tkiportalstorage/machine-uploads`
- `tkimediaprocessor/sms-media`

Do not migrate Azure runtime/system containers unless archival is explicitly wanted:

- `azure-webjobs-hosts`
- `azure-webjobs-secrets`
- `app-package-*`

## Recommended R2 Layout

Use one R2 bucket per Azure data container.

R2 buckets:

- `tkibinder`
- `tkisocial`
- `tonkaintl`
- `users`
- `machine-uploads`
- `sms-media`

Mapping example:

- Azure container: `tkibinder`
- Azure blob name: `companies/203/documents/vendor-invoices/100915/shelly-and-sands-invoice.pdf`
- R2 bucket: `tkibinder`
- R2 object key: `companies/203/documents/vendor-invoices/100915/shelly-and-sands-invoice.pdf`

This preserves the current application model of `container + filepath`.

## TODO

### 1. Create Buckets In R2

- [x] Create bucket `tkibinder`
- [x] Create bucket `tkisocial`
- [x] Create bucket `tonkaintl`
- [x] Create bucket `users`
- [x] Create bucket `machine-uploads`
- [x] Create bucket `sms-media`

### 2. Install Copy Tool

- [x] Install `rclone`

Suggested command on Windows:

```powershell
winget install Rclone.Rclone
```

### 3. Configure Rclone Remotes

- [x] Configure Azure remote for `tonkasharestorage`
- [x] Configure Azure remote for `tkiportalstorage`
- [x] Configure Azure remote for `tkimediaprocessor`
- [x] Configure R2 remote

Suggested remote names:

- `tonkashare`
- `tkiportal`
- `tkimedia`
- `r2`

Example commands with placeholders:

```powershell
rclone config create tonkashare azureblob account tonkasharestorage key "<TONKASHARESTORAGE_KEY>"
rclone config create tkiportal azureblob account tkiportalstorage key "<TKIPORTALSTORAGE_KEY>"
rclone config create tkimedia azureblob account tkimediaprocessor key "<TKIMEDIAPROCESSOR_KEY>"

rclone config create r2 s3 provider Cloudflare access_key_id "<R2_ACCESS_KEY_ID>" secret_access_key "<R2_SECRET_ACCESS_KEY>" endpoint "https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com" region auto
```

### 4. Run A Small Proof Test First

- [x] Pick 3 to 10 representative blobs from `tkibinder`
- [x] Copy them into the matching R2 bucket
- [x] Verify names, sizes, and openability
- [x] Repeat with one non-`tkibinder` container

Suggested proof targets:

- one PDF from `tkibinder`
- one image from `tkibinder`
- one blob from `tonkaintl`
- one blob from `sms-media` if used in production

### 5. Do Dry-Run Syncs

- [x] Dry-run `tkibinder`
- [x] Dry-run `tkisocial`
- [x] Dry-run `tonkaintl`
- [x] Dry-run `users`
- [x] Dry-run `machine-uploads`
- [x] Dry-run `sms-media`

Commands:

```powershell
rclone sync tonkashare:tkibinder r2:tkibinder --s3-storage-class STANDARD --progress --dry-run
rclone sync tonkashare:tkisocial r2:tkisocial --s3-storage-class STANDARD --progress --dry-run
rclone sync tonkashare:tonkaintl r2:tonkaintl --s3-storage-class STANDARD --progress --dry-run
rclone sync tkiportal:users r2:users --s3-storage-class STANDARD --progress --dry-run
rclone sync tkiportal:machine-uploads r2:machine-uploads --s3-storage-class STANDARD --progress --dry-run
rclone sync tkimedia:sms-media r2:sms-media --s3-storage-class STANDARD --progress --dry-run
```

### 6. Do Real Syncs

- [x] Sync `tkibinder` — 30,744 objects / 15.283 GiB ✓
- [x] Sync `tkisocial` — 54 objects / 1.596 GiB ✓
- [x] Sync `tonkaintl` — 4,422 objects / 1.887 GiB ✓
- [x] Sync `users` — 70 objects / 36.741 MiB ✓
- [x] Sync `machine-uploads` — 2 objects / 432.224 KiB ✓
- [x] Sync `sms-media` — 41 objects / 4.477 MiB ✓

Commands:

```powershell
rclone sync tonkashare:tkibinder r2:tkibinder --s3-storage-class STANDARD --progress
rclone sync tonkashare:tkisocial r2:tkisocial --s3-storage-class STANDARD --progress
rclone sync tonkashare:tonkaintl r2:tonkaintl --s3-storage-class STANDARD --progress
rclone sync tkiportal:users r2:users --s3-storage-class STANDARD --progress
rclone sync tkiportal:machine-uploads r2:machine-uploads --s3-storage-class STANDARD --progress
rclone sync tkimedia:sms-media r2:sms-media --s3-storage-class STANDARD --progress
```

### 7. Verify Copy Correctness

- [x] Compare object counts
- [x] Compare aggregate sizes
- [x] Run `rclone check` on major containers
- [ ] Open a few copied files through R2/public URL path — pending cutover

Commands:

```powershell
rclone size tonkashare:tkibinder
rclone size r2:tkibinder

rclone size tonkashare:tonkaintl
rclone size r2:tonkaintl

rclone size tonkashare:tkisocial
rclone size r2:tkisocial

rclone check tonkashare:tkibinder r2:tkibinder --size-only
rclone check tonkashare:tonkaintl r2:tonkaintl --size-only
rclone check tonkashare:tkisocial r2:tkisocial --size-only
```

### 8. Custom Domain Wiring

Requires: domain nameservers pointing at Cloudflare DNS (not just Cloudflare proxy).

Setup per bucket: R2 → bucket → Settings → Custom Domains → Add Domain

Cloudflare auto-creates the CNAME record. No manual DNS entry needed.

Decision needed per bucket: public access (direct URL works without signing) vs presigned-only.

| Bucket            | Custom Domain         | Status     | Access                     |
| ----------------- | --------------------- | ---------- | -------------------------- |
| `tkibinder`       | `files.tkibinder.com` | ✅ Active  | Enabled (public)           |
| `tonkaintl`       | `files.tonkaintl.com` | ✅ Active  | Enabled (public)           |
| `tkisocial`       | `files.tkiportal.com` | ⬜ Not set | Decide per-app             |
| `users`           | —                     | ⬜ Not set | Decide per-app             |
| `sms-media`       | —                     | ⬜ Not set | Presigned only likely fine |
| `machine-uploads` | —                     | ⬜ Not set | Internal only, skip        |

### 9. Application Cutover

#### API (tki-social-api) — this repo

- [x] Remove `@azure/storage-blob` from `package.json` — was never imported, dead dependency
- [x] Swap hardcoded Azure media URL to `R2_SMS_MEDIA_BASE_URL` env var
- [x] Deploy to Railway — service `tki-social-api` live at `https://tki-social-api-production.up.railway.app`
- [x] All env vars set in Railway (Azure AD, MongoDB, social platform credentials, BINDER_API_URL)
- [x] Health check passing: `GET /api/health` returns 200
- [x] Updated `TKISOCIAL_API_URL` in `tki-binder-api` Railway service to point to new URL
- [ ] Wire GitHub `main` branch to Railway service for Git-based auto-deploy (Railway dashboard → Service → Settings → Source)
- [ ] Add custom domain (e.g. `social-api.tkibinder.com`) after Git deploy is wired
- [ ] Set `R2_SMS_MEDIA_BASE_URL` in Railway env vars and local `.env` once `sms-media` custom domain is decided
- [ ] Replace `@azure/service-bus` usage with Railway alternative if/when media processor is migrated
- [ ] Replace `@azure/identity` + `@azure/ai-form-recognizer` if OCR pipeline is migrated
- [ ] Set `PORTAL_API_URL` and `PORTAL_INTERNAL_SECRET` in Railway once portal API URL is known
- [ ] Keep Azure read-only until confidence window passes

#### Frontend — separate repo, next migration target

The frontend holds Azure storage credentials directly and uploads using `@azure/storage-blob` client-side. The API is not involved in uploads.

- [ ] Identify all Azure storage env vars in the frontend (account name, account key, SAS token, container names)
- [ ] Swap `@azure/storage-blob` for `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
- [ ] Move Cloudflare R2 credentials to frontend env vars (`NEXT_PUBLIC_CLOUDFLARE_R2_ACCESS_KEY_ID`, etc.)
- [ ] Update bucket names and R2 endpoint (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)
- [ ] Remove `x-ms-blob-type: BlockBlob` from any upload `fetch`/`PUT` calls — Azure-specific, R2 rejects it
- [ ] For read URLs: update base URL env var to `files.tkibinder.com` / `files.tonkaintl.com` — custom domains already active
- [ ] Keep `filepath` values in DB unchanged — object keys are identical in R2

#### Hardcoded Azure URL — needs fix before SMS media links work

File: `api/services/smsService/messaging/incoming-twilio-sms/sendNotificationEmail.js`

```js
// BEFORE (hardcoded Azure)
function buildMediaUrl(blobPath) {
  const baseUrl = 'https://tkimediaprocessor.blob.core.windows.net/sms-media';
  return `${baseUrl}/${blobPath}`;
}

// AFTER (already updated to use env var — just needs value set)
function buildMediaUrl(blobPath) {
  const baseUrl = process.env.R2_SMS_MEDIA_BASE_URL;
  return `${baseUrl}/${blobPath}`;
}
```

- [x] Code updated to use `R2_SMS_MEDIA_BASE_URL` env var
- [ ] Decide custom domain for `sms-media` bucket (e.g. `sms.tkibinder.com`) or use R2 public dev URL temporarily
- [ ] Set `R2_SMS_MEDIA_BASE_URL` in Railway environment variables
- [ ] Set `R2_SMS_MEDIA_BASE_URL` in local `.env`

### 10. Post-Cutover Safety Window

- [ ] Keep Azure blobs untouched for rollback period
- [ ] Monitor failed file reads / missing objects
- [ ] Verify uploads are landing in R2
- [ ] Only then plan Azure cleanup

## Proof Test Workflow

Use this order for an initial smoke test:

1. copy a single known PDF from `tkibinder`
2. copy a single image from `tkibinder`
3. copy a single object from `tonkaintl`
4. verify object exists in R2 with same key
5. compare file size
6. if public, open via public URL
7. if private, verify retrieval through app logic or signed URL

## Notes

- `filepath` values should remain unchanged.
- The app should only need storage host/bucket logic updated.
- Do not delete Azure blobs during the first migration pass.
- Rotate or protect any credentials stored in `.env` before sharing the repo.
- For R2 with `rclone`, use `--s3-storage-class STANDARD` on copy and sync commands. The default request caused `InvalidStorageClass` errors during proof testing.
