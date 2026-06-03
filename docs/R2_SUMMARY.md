# Cloudflare R2 Migration Summary

Replaces direct-to-Azure frontend uploads with server-side R2 uploads through the API. Files now flow: **browser → API (multipart) → R2 → public URL stored in Mongo**.

---

## Endpoints

### New

| Method | Path                                                                | Purpose                                         |
| ------ | ------------------------------------------------------------------- | ----------------------------------------------- |
| `POST` | `/api/campaigns/:stockNumber/media/upload`                          | Upload campaign media (image/video/pdf, ≤100MB) |
| `POST` | `/api/tonka-spark-posts/:id/visual-prompts/:promptId/images/upload` | Upload visual prompt image (image only, ≤5MB)   |

### Changed (existing routes — same path, new behavior)

| Method   | Path                                                                   | Change                                    |
| -------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| `DELETE` | `/api/campaigns/:stockNumber/media/:id`                                | Now also deletes the underlying R2 object |
| `DELETE` | `/api/tonka-spark-posts/:id/visual-prompts/:promptId/images/:imageUrl` | Now also deletes the underlying R2 object |

All routes require the existing Clerk Bearer-token auth.

---

## Request / response shapes

### `POST /api/campaigns/:stockNumber/media/upload`

**Request** — `multipart/form-data`:

| Field         | Required | Type   | Notes                                    |
| ------------- | -------- | ------ | ---------------------------------------- |
| `file`        | yes      | binary | image/_, video/_, or application/pdf     |
| `description` | no       | string |                                          |
| `alt`         | no       | string |                                          |
| `tags`        | no       | string | Comma-separated, e.g. `"front,interior"` |

**Response** — `201`:

```json
{
  "stock_number": "EQ12345",
  "media_portfolio": [
    {
      "_id": "...",
      "url": "https://social-media.tonkaintl.com/campaigns/EQ12345/<uuid>-photo.jpg",
      "r2_key": "campaigns/EQ12345/<uuid>-photo.jpg",
      "filename": "photo.jpg",
      "media_type": "image",
      "size": 1234567,
      "description": "...",
      "alt": "...",
      "tags": ["front", "interior"],
      "created_at": "2026-05-26T..."
    }
  ]
}
```

### `POST /api/tonka-spark-posts/:id/visual-prompts/:promptId/images/upload`

**Request** — `multipart/form-data`:

| Field         | Required | Type   | Notes               |
| ------------- | -------- | ------ | ------------------- |
| `file`        | yes      | binary | image/\* only, ≤5MB |
| `alt`         | no       | string |                     |
| `description` | no       | string |                     |

`:id` accepts either `content_id` (UUID) or `_id` (ObjectId).

**Response** — `201`:

```json
{
  "url": "https://social-media.tonkaintl.com/sparks/<contentId>/visual-prompts/vp-01/<uuid>-image.jpg",
  "imageUrl": "https://social-media.tonkaintl.com/sparks/<contentId>/visual-prompts/vp-01/<uuid>-image.jpg",
  "filename": "image.jpg",
  "size": 123456,
  "visual_prompt": {
    "id": "vp-01",
    "images": [
      {
        "url": "...",
        "r2_key": "...",
        "filename": "...",
        "size": 123456,
        "created_at": "..."
      }
    ]
  }
}
```

(`url` and `imageUrl` carry the same value — frontend can use either.)

### `DELETE` routes

Response shape is unchanged from the pre-R2 versions. Internally the controller:

1. Looks up the stored `r2_key` on the media/image record.
2. Calls `DeleteObject` on R2.
3. Removes the entry from Mongo.

If the R2 delete fails, the Mongo entry is **left in place** and the API returns `502` — that way you don't end up with a dangling URL pointing at a now-missing object. Retry the request.

Legacy records written before this migration have no `r2_key`. The controller falls back to parsing the key out of the URL (by stripping `R2_PUBLIC_BASE_URL`). Old Azure URLs won't match the R2 base, so R2 deletion is skipped with a warning log and the Mongo entry is removed normally.

---

## Error responses

| Status | `code`                             | When                                       |
| ------ | ---------------------------------- | ------------------------------------------ |
| `400`  | `VALIDATION_ERROR`                 | Missing `file`, bad params, bad body       |
| `400`  | `LIMIT_FILE_SIZE`                  | File exceeds the size cap (5MB or 100MB)   |
| `400`  | `LIMIT_UNEXPECTED_FILE`            | Field name isn't `file`                    |
| `400`  | `UNSUPPORTED_FILE_TYPE`            | MIME type rejected by fileFilter           |
| `404`  | `NOT_FOUND` / `RESOURCE_NOT_FOUND` | Campaign / post / prompt / media not found |
| `502`  | `EXTERNAL_SERVICE_ERROR`           | R2 delete failed during DELETE route       |
| `500`  | `INTERNAL_SERVER_ERROR`            | Anything else                              |

All error responses include `requestId` for log correlation.

---

## Environment

Add to `.env`:

```ini
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=social
R2_PUBLIC_BASE_URL=https://social-media.tonkaintl.com
```

All five vars are read in [src/config/env.js](../src/config/env.js). Missing values produce a clear error at upload time (the app still boots without them — only the upload routes break).

The S3 client is built lazily and cached; we use `region: 'auto'` and point `endpoint` at `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` (R2's S3-compatible API).

---

## Cloudflare R2 prerequisites

- **Custom domain** — `social-media.tonkaintl.com` is attached to the `social` bucket with public read enabled. Returned URLs resolve directly in the browser.
- **CORS** — Not required for these endpoints (the browser talks to our API, not R2 directly). If we ever switch to presigned-URL uploads, add a bucket CORS rule allowing `PUT` from the frontend origin.

---

## Key conventions

R2 keys are prefixed by use case so lifecycle rules and audits stay easy:

```
campaigns/<stockNumber>/<uuid>-<sanitized-filename>
sparks/<contentId>/visual-prompts/<promptId>/<uuid>-<sanitized-filename>
```

UUID prefix avoids collisions and makes the object effectively immutable, which is why we set:

```
Cache-Control: public, max-age=31536000, immutable
```

Filenames are sanitized: `[^\w.\-]+` → `_`, capped at 120 chars. Extension preserved.

---

## Schema changes

Both media-bearing documents now carry an `r2_key` alongside `url` so deletes don't have to parse URLs:

- `social_campaigns.media_urls[].r2_key` — [src/models/socialCampaigns.model.js](../src/models/socialCampaigns.model.js)
- `tonka_spark_posts.visual_prompts[].images[].r2_key` — [src/models/tonkaSparkPost.model.js](../src/models/tonkaSparkPost.model.js)

Both are optional (no migration needed for existing records). Campaign uploads also flip `media_storage` to `r2` so older `azure` records remain identifiable.

Added [`MEDIA_STORAGE.R2`](../src/constants/campaigns.js) constant alongside the existing `AZURE` value.

---

## File map

**New**

- [src/services/r2.service.js](../src/services/r2.service.js) — S3 client, `uploadObject`, `deleteObject`, `getPresignedUploadUrl`, `getPresignedDownloadUrl`, `buildPublicUrl`, `keyFromPublicUrl`, `objectExists`
- [src/middleware/upload.js](../src/middleware/upload.js) — multer configs (`uploadImage` 5MB, `uploadMedia` 100MB), `mediaTypeFromMime` helper, `MulterUploadError` class
- [src/controllers/campaigns/methods/campaigns.controller.post.media.upload.js](../src/controllers/campaigns/methods/campaigns.controller.post.media.upload.js)
- [src/controllers/tonkaSparkPost/methods/tonkaSparkPost.controller.visualPrompt.uploadImage.js](../src/controllers/tonkaSparkPost/methods/tonkaSparkPost.controller.visualPrompt.uploadImage.js)

**Modified**

- [src/config/env.js](../src/config/env.js) — R2 env vars in zod schema
- [src/middleware/error.handler.js](../src/middleware/error.handler.js) — branches for `MulterError` and `MulterUploadError` → 400
- [src/models/socialCampaigns.model.js](../src/models/socialCampaigns.model.js) — `r2_key` field
- [src/models/tonkaSparkPost.model.js](../src/models/tonkaSparkPost.model.js) — `r2_key` field
- [src/constants/campaigns.js](../src/constants/campaigns.js) — `MEDIA_STORAGE.R2`
- [src/controllers/campaigns/methods/campaigns.controller.delete.media.delete.js](../src/controllers/campaigns/methods/campaigns.controller.delete.media.delete.js) — R2 object deletion
- [src/controllers/tonkaSparkPost/methods/tonkaSparkPost.controller.visualPrompt.deleteImage.js](../src/controllers/tonkaSparkPost/methods/tonkaSparkPost.controller.visualPrompt.deleteImage.js) — R2 object deletion
- [src/routes/campaigns.routes.js](../src/routes/campaigns.routes.js), [src/routes/tonkaSparkPosts.routes.js](../src/routes/tonkaSparkPosts.routes.js) — new routes
- [src/controllers/campaigns/methods.js](../src/controllers/campaigns/methods.js), [src/controllers/tonkaSparkPost/methods.js](../src/controllers/tonkaSparkPost/methods.js) — new exports

**Dependencies added**

- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner` (not used by current routes — wired in case we ever offer presigned uploads alongside the multipart endpoints)
- `multer`

---

## What's intentionally not built

- **Presigned upload URL endpoint** — The R2 service has `getPresignedUploadUrl()` ready, but no controller exposes it. If we ever want to bypass the API server for large file uploads (frontend PUTs directly to R2), it's a small controller away.
- **Image transforms / thumbnails** — Files are stored as-uploaded. If we want resized variants, add a transform step in the upload controller or use Cloudflare Images.
- **Quota / rate limit on uploads** — Relies on the global `rateLimiter` middleware. Per-user upload caps would need a separate counter.
- **Migration of existing Azure URLs** — Old records keep their Azure URLs and `media_storage: 'azure'`. They keep working for reads; deletes skip R2 (logged as a warning) and just remove the Mongo entry. If we want to migrate the actual bytes, we'd need a one-off script that downloads from Azure and re-uploads to R2.
