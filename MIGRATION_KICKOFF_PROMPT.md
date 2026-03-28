# Project Migration Kickoff Prompt

Use this file at the start of each project migration. Paste the prompt below into Copilot chat in that repository.

## How to use

1. Copy this file into the target project root.
2. Update the placeholders in the prompt.
3. Paste the full prompt into Copilot chat.
4. Review the assessment output before any code changes.

---

## Prompt to Paste

You are helping migrate this project off Azure.

### Working style requirements

- Work in read-only analysis mode first.
- Do not edit code or infra files until I approve a migration plan.
- Be explicit about facts vs assumptions.
- If something is unknown, say unknown and provide the exact command/file to verify.
- Never assume CI/CD is wired. Verify the real deploy trigger path (GitHub source branch vs manual deploy).
- Never print secret values in output. Use key names and hash/length checks only.

### Project context

- Project name: <PROJECT_NAME>
- Repo path: <REPO_PATH>
- Runtime/language: <NODE_DOTNET_PYTHON_ETC>
- Service type: <API_WEB_FUNCTION_WORKER_CRON>
- Current Azure services used (known): <LIST_OR_UNKNOWN>
- Frontend host: <VERCEL_OTHER_NONE>
- Data stores: <MONGO_POSTGRES_REDIS_ETC>
- File storage usage: <BLOB_SAS_PUBLIC_PRIVATE_UNKNOWN>
- Does the frontend hold storage credentials and upload directly? <YES_NO_UNKNOWN>
- Environment strategy: <LOCAL_ENV_KEYVAULT_GITHUB_SECRETS_UNKNOWN>

### What I want from you

Produce a migration assessment with these sections:

1. Current architecture inventory

- Entry points, runtimes, background jobs, schedulers, queues, storage, auth, and external APIs.
- List all Azure dependencies found in code/config/docs.

2. Environment and secrets map

- Enumerate required env vars from code and config.
- Classify each var: required/optional, secret/non-secret, source file reference.
- Identify Azure-specific vars and their likely replacement on the new platform.

3. Data and storage risk review

- Databases used and migration implications.
- Blob/object storage patterns: upload flow, signed URLs, public URL usage, URL persistence in DB.
- Any hardcoded Azure hostnames or SDK coupling.
- Does the app read blobs via direct URL or presigned URL? This determines whether the R2 bucket needs public access enabled.
- Does the app reference a blob hostname in any DB records, config values, or env vars? If yes, list every location.

  3.1 Frontend storage coupling (required if frontend exists)

  **Important:** Do not assume the API brokers uploads. In this portfolio, the frontend holds storage credentials directly and uploads using the Azure Blob SDK client-side. Verify which pattern applies before assessing risk.

  Pattern A — Frontend-direct (likely for this portfolio):
  - Frontend has Azure storage account key in env vars (e.g. `NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT`, `NEXT_PUBLIC_AZURE_STORAGE_KEY` or similar).
  - Frontend uses `@azure/storage-blob` (or equivalent) to generate SAS tokens and upload directly to Azure — no backend involvement.
  - Migration: swap `@azure/storage-blob` for `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`, move R2 credentials to frontend env vars, update bucket/endpoint config.
  - Remove any `x-ms-blob-type: BlockBlob` headers from upload fetch calls — Azure-specific, R2 will reject them.
  - For read URLs: if the bucket has a `files.<domain>.com` custom domain active in Cloudflare R2, the frontend base URL env var becomes a config-only swap with no code change.

  Pattern B — API-brokered (less common in this portfolio):
  - Frontend calls an API endpoint to get a presigned URL, then uploads directly to storage.
  - API holds credentials; frontend never sees them.
  - Migration: swap the API's storage SDK and point presigned URL generation at R2.

  For both patterns:
  - Scan the frontend for any blob hostnames (`*.blob.core.windows.net`, `*.r2.dev`, `*.r2.cloudflarestorage.com`, custom storage domain).
  - List every frontend env var referencing a storage account, key, endpoint, or hostname.
  - Confirm the target R2 bucket custom domain is `Active` in Cloudflare before updating frontend env vars.

4. Deployment and operations review

- Current deploy path (CI/CD, scripts, manual steps).
- Required health checks, cron jobs, workers, scaling assumptions.
- Observability and logging dependencies.

  4.1 Deployment wiring verification (required)

- Confirm whether deployment is Git-driven or manual (`railway up` style).
- If Git-driven, identify exact source repo + branch + environment mapping.
- If manual, call out that push/PR events will not trigger deploys.

  4.2 Environment parity verification (required)

- Compare target platform env vars against source-of-truth env set.
- Report only: missing keys, extra keys, and mismatched keys (no secret values).
- Explicitly flag auth key mode mismatches (for example test vs live keys).

5. Target platform recommendation for this project

- Compare Railway vs Render vs GCP Cloud Run for this specific repo.
- Recommend one target and justify by simplicity, stability, and cost.
- Recommend storage target (Cloudflare R2 vs S3) and DB target.

If target platform is already decided by user, skip comparison and provide a platform-specific execution plan only.

6. Migration plan (project-specific)

- Phase 0: prerequisites
- Phase 1: dual-run or shadow testing
- Phase 2: cutover
- Phase 3: cleanup
- Include rollback steps for each phase.

  6.1 Custom domain wiring (if storage is migrated to R2)
  - Only possible if domain nameservers are managed by Cloudflare.
  - Setup: R2 → bucket → Settings → Custom Domains → Add Domain. Cloudflare auto-creates the CNAME; no manual DNS entry needed.
  - Confirm per bucket: public access required (direct URL reads) or presigned-only (private bucket).
  - Recommended pattern: `files.<domain>.com` for business-facing buckets. Skip custom domain for internal-only buckets (sms-media, machine-uploads) where presigned URLs are sufficient.
  - If domain is NOT on Cloudflare yet, this step is blocked until nameserver migration is complete.

7. Effort and risk estimate

- T-shirt size (S/M/L/XL)
- Top 5 risks with mitigation.
- Suggested order in portfolio migration queue.

8. API endpoint compatibility and route drift scan

- Build an endpoint inventory from the current codebase (method + path + auth + request/response shape notes).
- Identify endpoints likely to move, be renamed, or change payload structure during migration.
- Flag potential breaking changes and classify each as low/medium/high client impact.
- Include a compatibility strategy per endpoint: keep as-is, add alias route, 301/308 redirect, adapter layer, or planned deprecation.
- Provide a "search plan" to detect endpoint references across repos (frontend, scripts, docs, tests, postman).
- List exact search patterns to run repeatedly during migration (old route, new route, hostnames, version prefixes).

9. Hidden cloud coupling scan

- Find provider-coupled env var names (for example `AZURE_*`) and propose neutral aliases.
- Find hardcoded provider hostnames (for example `*.blob.core.windows.net`, `*.azurewebsites.net`).
- Identify installed-but-unused cloud SDK packages that can be removed later.

### Required output format

- Provide findings first.
- Include a table of discovered env vars with file references.
- Include a table of Azure dependencies with replacement mapping.
- Include an endpoint compatibility matrix with columns: method, current path, proposed path, breaking risk, mitigation, consumers found.
- Include a repeated search command set for endpoint drift validation.
- Include a deployment wiring verdict: `Git-driven` or `Manual-driven`, with evidence.
- Include an env parity summary table: `missing`, `extra`, `mismatched` key counts.
- Include stale naming/domain findings (for example legacy `-poc-` hostnames) across docs and code.
- Include a final checklist I can execute.

### If you need to run commands

Prefer these first:

- ripgrep for discovery
- package/dependency inspection
- read-only Azure CLI queries only when I explicitly allow it

When scanning endpoints, include recurring searches like:

- `rg -n "(/api/|https?://|azurewebsites\.net|blob\.core\.windows\.net)"`
- `rg -n "(fetch\(|axios\.|baseURL|API_URL|NEXT_PUBLIC_|VITE_)"`
- `rg -n "(swagger|openapi|postman|insomnia|routes?|router\.)"`
- `rg -n "(<OLD_ENDPOINT>|<NEW_ENDPOINT>|<OLD_HOST>|<NEW_HOST>)"`

Start now by scanning this repository and returning the assessment.
