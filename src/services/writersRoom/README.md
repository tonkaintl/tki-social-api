# Writer's Room

Replaces the n8n **Writer's Room** workflow with a single Node service. Given a story idea + a handful of knobs, it routes the idea through a panel of "writers" (LLMs with different specialties), drafts a piece, line-edits it, and packages it for distribution.

## What it does, end to end

1. Caller (or cron) hits `POST /api/writers-room/run` with a `story_seed` and any optional knobs.
2. Pipeline normalizes the input, picks which of 6 specialist writers should contribute (and how heavily), runs the active writers in parallel, merges their notes, and builds the Head Writer's system prompt from the chosen brand voice + project mode.
3. Head Writer drafts; Final Editor polishes; optional output nodes (Art Director, Social Media Director, Future Story Arc) package the result.
4. The final payload is forwarded in-process to `saveTonkaSparkPost()` — which writes the production record to `tonka_spark_posts` and fires the notification email — exactly like the n8n flow's final step used to do via HTTP.
5. The entire run is also archived to `writers_room_runs` with per-phase snapshots, so failed/partial runs can be mined for gems (good writer notes, useful research findings, etc.). 90-day TTL.
6. Caller gets back the finished payload plus a `trace` of every step taken (durations, errors), a `runId` to inspect the archive record, and a `sparkPostDocumentId` to fetch the production record.

Pipeline order (the orchestrator in [`index.js`](./index.js)):

```
[createRun]                                                                  ← persistence: archive starts
inputNormalizer → projectMode → genreToneRouter (LLM)
        → [comedy | historic | biographer | scifi | documentary | action]    (parallel writer LLMs)
        + researcher (Perplexity, in parallel)                                (when enable_research = true)
        → buildWriterPanel → draftContext
        → headWriter (LLM) → finalEditor (LLM)
        → artDirector?         (LLM, if outputs.visual_prompts)
        → socialMediaDirector? (LLM, if outputs.blog_post)
        → futureStoryArc?      (LLM, if outputs.future_story_arc)
        → finalDispatch
        → saveTonkaSparkPost   (production sink + notification email; skippable)
[finalize]                                                                   ← persistence: archive closed
```

A snapshot is written to the run record after every major phase (router → writers/research → panel → draftContext → headWriter → finalEditor → outputs), so a crash mid-pipeline still leaves the intermediate outputs minable.

The research call runs in parallel with the writer brainstorms, so its latency is hidden behind the slowest writer. Its findings get merged into `ctx.research` before `draftContext` builds the Head Writer's system message, so the draft is grounded in fresh facts + cited sources.

Each step is its own file under [`nodes/`](./nodes/). LLM prompts live in [`prompts/<slug>/`](./prompts/) as `system.md`, `user.md`, optional `schema.json`, and `meta.json` (which carries the provider, model, temperature, etc.).

## Endpoints

All routes are mounted at `/api/writers-room` and require Bearer auth.

### `POST /run` — run the whole pipeline

Request body (everything optional except `story_seed` unless `useRotation: true`):

```json
{
  "story_seed": "How to Avoid Overvaluing Your Equipment",
  "useRotation": false,
  "peek": false,
  "project_mode": "blog_post",
  "target_brand": "tonka_blog",
  "target_audience": "used Class 8 truck buyers",
  "fact_to_fiction": 30,
  "creativity_to_reporter": 60,
  "tone_strictness": 70,
  "draft_length": "medium",
  "enable_research": false,
  "facts": null,
  "output_blog_post": true,
  "output_future_story_arc": false,
  "output_visual_prompts": false,
  "output_reference_doc": false,
  "notifier_email": ""
}
```

Response:

```json
{
  "ok": true,
  "status": "succeeded",
  "durationMs": 14820,
  "requestId": "…",
  "runId": "65a1b2c3d4e5f6789abc1234",
  "sparkPostDocumentId": "65a1b2c3d4e5f6789abc5678",
  "idea": null,
  "trace": [
    { "name": "inputNormalizer", "ms": 0,    "ok": true },
    { "name": "projectMode",     "ms": 1,    "ok": true },
    { "name": "genreToneRouter", "ms": 980,  "ok": true },
    { "name": "writers/documentary", "ms": 2100, "ok": true },
    { "name": "writers/action",  "ms": 1800, "ok": true },
    "…",
    { "name": "forwardToSparkPost", "ms": 120, "ok": true }
  ],
  "output": {
    "story_seed": "…",
    "project":   { "brand": "tonka_blog", "mode": "blog_post", "audience": "…", "brand_meta": { … } },
    "writer_panel": [ { "role": "documentary", "weight": 0.7 }, … ],
    "writer_notes": { "documentary": { "notes": ["…"], "weight": 0.7 }, … },
    "pre_edit_head_draft": { "role": "head_writer", "title": "…", "thesis": "…", "draft_text": "…", "summary": "…" },
    "final_draft":   { "role": "final_editor", "title": "…", "thesis": "…", "draft_markdown": "…", "summary": "…" },
    "title_variations": ["…", "…", "…", "…", "…"],
    "platform_summaries": { "linkedin": "…", "x": "…", "meta": "…", "youtube": "…", "tonkaintl": "…" },
    "visual_prompts": [],
    "future_story_arc_generator": { "arcs": [] },
    "research": { "enable_research": false, "facts": null, "findings": [], "citations": [], "topics_covered": [] },
    "head_writer_system_message": "…",
    "project_mode_profile": { … }
  }
}
```

- `status` is one of `succeeded` | `partial` | `failed`. `partial` means the pipeline produced a draft but forwarding to tonka_spark_posts failed (e.g. email service down) — the run is still archived and the response includes the output.
- `runId` is the `writers_room_runs._id` — pass to `GET /runs/:id` to see snapshots + the full trace.
- `sparkPostDocumentId` is the `tonka_spark_posts._id` — the production record consumers act on.
- Pass `forwardToSparkPost: false` in the body to skip the production-sink save (useful for dry runs / preview).

If a step throws, you get `ok: false` plus the trace + the runId so you can mine the partial snapshots:

```json
{
  "ok": false,
  "code": "LLM_CALL_FAILED",
  "message": "OpenAI call failed: …",
  "runId": "65a1b2c3d4e5f6789abc1234",
  "trace": [ … ]
}
```

### `POST /test-node` — run one node in isolation

Lets you iterate on a single prompt without re-running everything upstream. The `context` you pass needs whatever shape that node expects (e.g. for `genreToneRouter` you need a post-`projectMode` context with `story_seed`, `project`, `creative`, `research`).

```json
{
  "node": "genreToneRouter",
  "context": {
    "story_seed": "How to Avoid Overvaluing Your Equipment",
    "project": { "brand": "tonka_blog", "mode": "blog_post", "audience": "" },
    "creative": {
      "fact_to_fiction": 30,
      "creativity_to_reporter": 60,
      "tone_strictness": 70,
      "length": "medium"
    },
    "research": { "enable_research": false, "facts": null }
  }
}
```

Valid `node` values are everything exported by `PIPELINE_NODE` in [`constants/writersroom.js`](../../constants/writersroom.js):

```
artDirector, buildWriterPanel, draftContext, finalDispatch, finalEditor,
futureStoryArc, genreToneRouter, headWriter, inputNormalizer, projectMode,
researcher, socialMediaDirector, writerAction, writerBiographer,
writerComedy, writerDocumentary, writerHistoric, writerSciFi
```

### `GET /next-idea` — peek the rotation

Returns the next idea SEASON-01-IDEAS.md would hand the cron, without advancing the cursor:

```json
{
  "ok": true,
  "cursor": 12,
  "idea": "From Photos to Videos: How to Showcase Your Machine for the Best Price",
  "totalIdeas": 75,
  "lastUsedAt": "2026-05-23T20:00:00.000Z"
}
```

### `GET /runs` — browse run history

List every run with filters. Heavy fields (`final_payload`, large snapshot blobs) are dropped from the list view — use `GET /runs/:id` for the full record. This is the main interface for mining failed runs.

Query params (all optional):

| param             | values                                            | notes                                          |
| ----------------- | ------------------------------------------------- | ---------------------------------------------- |
| `status`          | `running` \| `succeeded` \| `partial` \| `failed` | Most useful for finding gems: `?status=failed` |
| `brand`           | e.g. `tonka_blog`                                 | exact match on `target_brand`                  |
| `mode`            | e.g. `blog_post`                                  | exact match on `project_mode`                  |
| `triggered_by`    | `api` \| `cron` \| `test-node`                    | who started it                                 |
| `story_seed`      | substring                                         | case-insensitive regex match                   |
| `since` / `until` | ISO date                                          | bounded date range                             |
| `page`            | integer ≥ 1                                       | default 1                                      |
| `limit`           | integer 1–100                                     | default 25                                     |

Response:

```json
{
  "ok": true,
  "count": 25,
  "totalCount": 412,
  "page": 1,
  "totalPages": 17,
  "filters": { "status": "failed" },
  "runs": [
    {
      "_id": "65a1b2c3d4e5f6789abc1234",
      "status": "failed",
      "story_seed": "How to Avoid Overvaluing Your Equipment",
      "target_brand": "tonka_blog",
      "project_mode": "blog_post",
      "triggered_by": "cron",
      "started_at": "2026-05-23T14:00:00.000Z",
      "finished_at": "2026-05-23T14:00:23.000Z",
      "duration_ms": 23120,
      "trace": [ … ],
      "error": { "code": "LLM_CALL_FAILED", "message": "OpenAI call failed: …" },
      "snapshots": {
        "writers": { … },
        "research": { … },
        "writer_notes": { … },
        "writer_panel": [ … ],
        "visual_prompts": null,
        "blog_post_package": null,
        "future_arcs": null
      }
    },
    "…"
  ]
}
```

### `GET /runs/:id` — full run record

Returns one run including `final_payload` and every snapshot, including the bulky `head_writer_system_message` and `head_draft`. Use this when you've spotted a candidate in `/runs` and want to inspect everything.

## Cron

Schedule: **06:00 and 14:00 America/Chicago, Monday through Friday** — `0 6,14 * * 1-5` in [`constants/writersroom.js`](../../constants/writersroom.js). The timezone string handles DST automatically (CST in winter, CDT in summer).

Started in [`server.js`](../../server.js) via `startWritersRoomCron()`. Each fire:

1. Calls `takeNextIdea()` — atomically reads SEASON-01-IDEAS.md, picks the next idea by cursor, advances the cursor, stamps `last_used_at`.
2. Calls `runPipeline({ story_seed: idea }, { triggeredBy: 'cron', ideaRotation: { cursor, total_ideas } })` with all defaults (blog_post, tonka_blog, short length, no research, blog-post-only output).
3. Logs the resulting `runId`, `sparkPostDocumentId`, and `status`.

Every cron run lands in `writers_room_runs` with `triggered_by: 'cron'` and the `idea_rotation` block populated, so `GET /runs?triggered_by=cron` audits exactly what the schedule produced.

Concurrency guard: if a previous run is still in flight when the next 06:00/14:00 trigger fires, the new fire logs a warning and skips.

**Disabled by default.** Set `WRITERS_ROOM_CRON_ENABLED=true` in env to arm it. The endpoint still works regardless of the cron flag.

To run the cron logic on demand (skipping the wait), import and call `runWritersRoomNow()` from [`writersRoom.cron.js`](../writersRoom.cron.js) — useful from a one-off script or an admin endpoint.

## Idea rotation: `SEASON-01-IDEAS.md`

Lives at the repo root: [`SEASON-01-IDEAS.md`](../../../SEASON-01-IDEAS.md). The file is a flat list of 75 post ideas grouped by section. Format:

```
Appendix: TKI Dispatch
Season 1: Master List of 75 Post Ideas
Selling & Vendors
How to Avoid Overvaluing Your Equipment
The Auction vs. Broker Dilemma: Why Tonka Is the Better Option
What Makes a 'Good' Machine for Sale? 5 Key Indicators for Sellers
…
Buyers & Transparency
Why 'As-Is / Where-Is' Isn't a Cop-Out — It's the Truth
How to Read Between the Lines of an Equipment Listing
…
Tonka Voice, Culture & Industry Insight
What We've Learned Moving 6,000+ Machines
…
```

Rules the loader applies (see [`ideaRotation.js`](./ideaRotation.js)):

- Section headers (`Appendix: TKI Dispatch`, `Season 1: Master List of 75 Post Ideas`, `Selling & Vendors`, `Buyers & Transparency`, `Tonka Voice, Culture & Industry Insight`) are filtered out. Set in `IDEA_ROTATION.SECTION_HEADERS` if you add new ones.
- Empty lines are skipped.
- Leading `-`, `*`, or `1.` markers are stripped (in case you reformat).
- Everything else is an idea.

Rotation state lives in Mongo, collection `writers_room_idea_cursors`, key `season01_idea_cursor`. Each run does `cursor = cursor % totalIdeas`, uses `ideas[cursor]`, then `$inc: { cursor: 1 }`. When `cursor` reaches `totalIdeas` it naturally wraps to 0 on the next read, so every idea fires once before any repeats.

To **reset** the rotation (start back at idea #1), call `resetIdeaCursor()` from [`ideaRotation.js`](./ideaRotation.js) or delete the document directly:

```js
db.writers_room_idea_cursors.deleteOne({ key: 'season01_idea_cursor' });
```

You can edit `SEASON-01-IDEAS.md` between runs — the file is read fresh every call, no restart needed. If you add ideas, the cursor stays where it is and new ideas slot in at the end.

## Input variables

The pipeline accepts anything matching the shape below. Anything missing falls back to the default in `PIPELINE_INPUT_DEFAULTS`.

| Field                     | Type           | Default      | Notes                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | -------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `story_seed`              | string         | —            | The idea for the piece. Required unless `useRotation: true`.                                                                                                                                                                                                                                                               |
| `project_mode`            | enum           | `blog_post`  | One of `blog_post`, `future_story_arc`, `mixed_allegory`, `novella_chapter`, `reference_doc`, `screenplay`, `social_post`, `story_prompts`, `straight_ad`, `visual_prompts`, `dispatch_essay`, `default_mode`. Controls structure + headWriter instructions. See [`profiles/projectModes.js`](./profiles/projectModes.js). |
| `target_brand`            | enum           | `tonka_blog` | One of `tonka_blog`, `tonka_newsletter`, `diesel_kings`, `echoloop`, `generic_brand`, `ketosis_lifestyle_project`, `purple_star`, `theater_404`. Controls voice + brand guidelines. See [`profiles/brands.js`](./profiles/brands.js).                                                                                      |
| `target_audience`         | string         | `""`         | Free-form. Shows up in the Head Writer's system prompt.                                                                                                                                                                                                                                                                    |
| `fact_to_fiction`         | number 0–100   | `50`         | 0 = pure fantasy, 100 = pure factual.                                                                                                                                                                                                                                                                                      |
| `creativity_to_reporter`  | number 0–100   | `50`         | 0 = wild creative, 100 = dry reporter.                                                                                                                                                                                                                                                                                     |
| `tone_strictness`         | number 0–100   | `50`         | 0 = loose, 100 = strict to brand rules.                                                                                                                                                                                                                                                                                    |
| `draft_length`            | enum           | `short`      | `short` (~500–700 words), `medium` (~900–1,200), `long` (~1,500–2,000+).                                                                                                                                                                                                                                                   |
| `enable_research`         | boolean        | `false`      | When true, the Perplexity researcher runs in parallel with the writer brainstorms and grounds the Head Writer's draft in fresh, cited findings. Requires `PERPLEXITY_API_KEY`. Also boosts the `documentary` writer in the router.                                                                                         |
| `facts`                   | string \| null | `null`       | Pre-supplied facts/findings. Forwarded to the researcher as context to extend (not contradict), to writers, and to the Head Writer.                                                                                                                                                                                        |
| `output_blog_post`        | boolean        | `true`       | If true, runs Social Media Director after the final edit.                                                                                                                                                                                                                                                                  |
| `output_visual_prompts`   | boolean        | `false`      | If true, runs Art Director.                                                                                                                                                                                                                                                                                                |
| `output_future_story_arc` | boolean        | `false`      | If true, runs the Future Story Arc generator.                                                                                                                                                                                                                                                                              |
| `output_reference_doc`    | boolean        | `false`      | Reserved; not wired in v1.                                                                                                                                                                                                                                                                                                 |
| `notifier_email`          | string         | `""`         | Reserved; not wired in v1.                                                                                                                                                                                                                                                                                                 |
| `useRotation`             | boolean        | `false`      | If true (or if `story_seed` is empty), pulls the next idea from SEASON-01-IDEAS.md and advances the cursor.                                                                                                                                                                                                                |
| `peek`                    | boolean        | `false`      | When `useRotation: true`, peek the next idea without advancing. Useful for testing.                                                                                                                                                                                                                                        |
| `forwardToSparkPost`      | boolean        | `true`       | When false, the pipeline still runs end-to-end and persists to `writers_room_runs`, but skips the production-sink save to `tonka_spark_posts` and the notification email. Use for dry runs / previews.                                                                                                                     |

## Frontend form (suggested mapping)

The original n8n flow exposed a form trigger. If you rebuild that as a frontend form, the simplest mapping is to send the JSON above directly to `POST /api/writers-room/run`. A minimal form needs:

| UI element   | Field                                                                  | Required | Suggested control                                                  |
| ------------ | ---------------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| Textarea     | `story_seed`                                                           | yes      | placeholder "The gist of the story"                                |
| Dropdown     | `project_mode`                                                         | yes      | options listed above; default `blog_post`                          |
| Dropdown     | `target_brand`                                                         | yes      | options listed above; default `tonka_blog`                         |
| Text         | `target_audience`                                                      | no       | placeholder "voice and framing"                                    |
| Slider       | `fact_to_fiction`                                                      | no       | 0–100, default 50, label "0 = pure fantasy → 100 = pure factual"   |
| Slider       | `creativity_to_reporter`                                               | no       | 0–100, default 50, label "0 = wild creative → 100 = dry reporter"  |
| Slider       | `tone_strictness`                                                      | no       | 0–100, default 50, label "0 = loose → 100 = strict to brand rules" |
| Dropdown     | `draft_length`                                                         | no       | `short` \| `medium` \| `long`, default `short`                     |
| Toggle       | `enable_research`                                                      | no       | default off                                                        |
| Textarea     | `facts`                                                                | no       | only shown when `enable_research` is on                            |
| Toggle group | `output_blog_post`, `output_visual_prompts`, `output_future_story_arc` | no       | one toggle per output node, default on for blog post               |

The original n8n form also had `max_revisions`, `output_screenplay`, `output_story_prompts`, `output_socials`, `output_gdocs`, `output_mongo_log` fields. They aren't in v1 — they were either unused in the n8n flow or are out-of-scope side effects (gDocs). Skip them in the new form.

## LLM providers

Each prompt's `meta.json` declares its provider and model. Four providers are used. The generic LLM router ([`llm/index.js`](./llm/index.js)) dispatches the chat-LLM providers (`gemini`, `openai`, `openai-agent`); the researcher node calls Perplexity directly via [`llm/perplexity.js`](./llm/perplexity.js) so it can capture the response's `citations` array alongside the JSON body.

| Provider       | SDK                                                     | Key env              | Default-model env  | Where used                                                                                           |
| -------------- | ------------------------------------------------------- | -------------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `gemini`       | `@google/genai`                                         | `GEMINI_API_KEY`     | `GEMINI_MODEL`     | Genre Tone Router, Documentary writer, Historic writer, Biographer writer                            |
| `openai`       | `openai`                                                | `OPENAI_API_KEY`     | `OPENAI_MODEL`     | Comedy / SciFi / Action writers, Final Editor, Art Director, Social Media Director, Future Story Arc |
| `openai-agent` | `openai` (chat completions w/ JSON schema)              | `OPENAI_API_KEY`     | `OPENAI_MODEL`     | Head Writer                                                                                          |
| `perplexity`   | raw HTTP (axios) → `api.perplexity.ai/chat/completions` | `PERPLEXITY_API_KEY` | `PERPLEXITY_MODEL` | Researcher (live web research with citations)                                                        |

The variety is intentional — different model families give the panel different voices. To change a model, edit `meta.json` for that prompt; the orchestrator picks it up on next restart (or call `clearPromptCache()` from [`llm/loadPrompt.js`](./llm/loadPrompt.js)).

If a provider's API key isn't set, the corresponding LLM call throws `MISSING_API_KEY`. The other nodes keep working — you can iterate on, say, the Gemini-backed nodes without an OpenAI key configured.

## Prompt files

Layout under [`prompts/`](./prompts/):

```
prompts/
  genreToneRouter/{system.md, user.md, meta.json}
  researcher/{system.md, user.md, meta.json}              ← Perplexity, no schema
  writers/comedy/{system.md, user.md, schema.json, meta.json}
  writers/historic/…
  writers/biographer/…
  writers/scifi/…
  writers/documentary/…
  writers/action/…
  headWriter/…
  finalEditor/{system.md, user.md, schema.json, meta.json}
  artDirector/…
  socialMediaDirector/…
  futureStoryArc/…
```

- `system.md` — the system / instructions message.
- `user.md` — the user message. Placeholders use `{{path.to.value}}` and resolve against the context the orchestrator passes in. Missing fields render as empty strings (no crash).
- `schema.json` (optional) — JSON Schema for structured output. When present, the OpenAI wrapper uses `response_format: json_schema` and the node receives a parsed object.
- `meta.json` — `provider`, `model`, `temperature`, `topP`, `maxOutputTokens`, `jsonOutput`, `hasStructuredOutput`, `structuredOutputName`. Edit this to swap models or tweak temperatures without touching code.

## Brand + project mode profiles

[`profiles/brands.js`](./profiles/brands.js) and [`profiles/projectModes.js`](./profiles/projectModes.js) hold the brand voice + mode behavior the Head Writer leans on. They're plain JS modules — to add a new brand or mode, append an entry and reference the key from input.

The Head Writer's system message is built from these two registries plus the active writer panel and creative sliders. The build is in `buildHeadWriterSystemMessage()` in [`profiles/projectModes.js`](./profiles/projectModes.js).

## Research (Perplexity)

When `enable_research: true`, the [`researcher`](./nodes/researcher.js) node runs in parallel with the writer brainstorms. It calls Perplexity's chat completions API (`api.perplexity.ai/chat/completions`), which returns both a JSON body and a `citations` array of source URLs the model used.

**Default model:** `sonar-pro` — broader coverage with citations. Edit [`prompts/researcher/meta.json`](./prompts/researcher/meta.json) to swap to `sonar` (cheaper/faster), `sonar-reasoning`, or `sonar-deep-research`.

**Prompt:** [`prompts/researcher/system.md`](./prompts/researcher/system.md) tells the model it's gathering grounded, verifiable facts (dates, numbers, regulations, inspection criteria, market data) tailored to the active brand and audience. It defaults to a trucking/equipment-industry frame but works for any topic — the user message just hands it the story_seed.

**Output merged into `ctx.research`:**

```js
{
  enable_research: true,
  facts:           "<whatever the caller passed in>",
  findings:        ["fact 1", "fact 2", "..."],   // 4–8 grounded statements
  topics_covered:  ["inspection", "title", "..."],
  citations:       ["https://...", "https://...", ...]
}
```

`findings` get rendered into the Head Writer prompt as a bulleted list via the `research_findings_text` placeholder, so the draft is anchored in real facts. Citations stay on the response payload for downstream consumers (export, debug UI, etc.).

**Failure mode:** if the Perplexity call fails (rate limit, network blip, bad key), the researcher logs loudly and returns empty findings + an `error` block. The pipeline keeps going so the Head Writer still gets to draft — just without grounded facts. The trace step shows the failure for debugging.

**Cost-conscious tip:** the researcher only runs when `enable_research: true` (or when caller passes `facts` and you want the model to extend them — set both). The cron defaults to research off; flip it on per-call when you want grounded output.

## Persistence (`writers_room_runs` + `tonka_spark_posts`)

Two collections, two purposes.

### `tonka_spark_posts` — production sink

Successful pipeline runs land here. This is what consumers read for "today's draft" — the email template renders out of this collection, and the existing `tonka_spark_posts` consumers are unchanged. Same shape, same `content_id`, same `status` field (`draft` → `sent` after the notification email fires) as before. The pipeline writes here in-process via [`saveTonkaSparkPost()`](../tonkaSparkPost.service.js); the legacy `POST /api/webhooks/tonka-spark-post` route still works for n8n compatibility but now calls the same service function.

Forwarding can be disabled per call by passing `forwardToSparkPost: false` in the run body — useful for previewing what the pipeline would produce without sending the notification email or persisting to production.

### `writers_room_runs` — forensic archive

Every run lands here regardless of status. The archive's job is to capture intermediate outputs so when a run fails (or produces a draft that's "fine but not great"), you can still mine the partial work. Common moves:

- **Find failed runs**: `GET /runs?status=failed`
- **Find runs that produced a final draft but the spark-post forward broke**: `GET /runs?status=partial`
- **Audit what the cron produced last week**: `GET /runs?triggered_by=cron&since=2026-05-16`
- **Inspect a specific run**: `GET /runs/<runId>` → look at `snapshots.writer_notes`, `snapshots.head_draft`, `snapshots.research`, etc.

Each run document includes:

```js
{
  status:        'running' | 'succeeded' | 'partial' | 'failed',
  triggered_by:  'api' | 'cron' | 'test-node',
  input:         { /* exactly what the caller posted — copy + tweak to replay */ },
  story_seed:    '…',        // denormalized for fast filtering
  target_brand:  '…',        // denormalized for fast filtering
  project_mode:  '…',        // denormalized for fast filtering
  idea_rotation: { cursor, total_ideas },  // set on cron-triggered runs
  trace:         [ { name, ms, ok, error?, errorCode? }, … ],
  snapshots: {
    writers:                  { /* genreToneRouter output */ },
    research:                 { /* researcher output */ },
    writer_notes:             { /* per-role brainstorm output */ },
    writer_panel:             [ /* sorted enabled writers */ ],
    head_writer_system_message: '…',
    head_draft:               { /* pre-edit draft */ },
    final_draft:              { /* edited draft */ },
    visual_prompts:           [ /* art director output, if requested */ ],
    blog_post_package:        { /* title_variations + platform_summaries */ },
    future_arcs:              [ /* future story arcs, if requested */ ]
  },
  final_payload:            { /* the finalDispatch output */ },
  forwarded_to_spark_post:  true,
  spark_post_document_id:   ObjectId,    // link to the tonka_spark_posts record
  error:                    { code, message, stack },  // present on failed runs
  duration_ms:              23120,
  started_at, finished_at, created_at, purge_at
}
```

**Retention**: a TTL index on `purge_at` deletes runs after 90 days (`RUN_RETENTION_DAYS` in [`constants/writersroom.js`](../../constants/writersroom.js)). Adjust there if you want a longer archive.

**Persistence failures never kill a run.** If Mongo is down or the runs collection can't write, the orchestrator logs and continues — the pipeline still produces output and still tries to forward to `tonka_spark_posts`. You lose the archive entry for that run only.

## Testing

One spec file: [`src/tests/writersRoom.llmKeys.spec.js`](../../tests/writersRoom.llmKeys.spec.js). It pings each configured LLM provider (OpenAI / Gemini / Perplexity) with a minimal request to verify the key works, the model name is reachable, and the wrapper parses the response. Each provider's tests auto-skip when its key isn't set.

```bash
npx vitest run src/tests/writersRoom.llmKeys
```

Run this after editing a model name in `.env` or after a provider rotates a key. It's the one failure mode that's silent until 6am the next morning.

## Out of v1 scope (what didn't get ported)

- **Google Docs export** — n8n had optional "create gDoc / update gDoc" nodes gated by `outputs.gdocs_folder_id`. Skipped because no Google Docs SDK is wired up. The flag still flows through the input shape so you can detect requests for it. Note: the original gDocs node's use case (capturing partial outputs from failed runs) is now covered by `writers_room_runs` snapshots, so gDocs export is purely "nice to have a human-readable doc to share" at this point.

## File map

```
src/services/writersRoom/
  README.md                  ← you are here
  index.js                   ← orchestrator + runPipeline()
  ideaRotation.js            ← SEASON-01-IDEAS.md reader + cursor advance
  persistence.service.js     ← writers_room_runs CRUD + snapshot writes
  merge.js                   ← shared merge helpers
  decisions.js               ← shared if/gate helpers
  llm/
    index.js                 ← provider router (callLlmFromPrompt)
    loadPrompt.js            ← prompt + template loader
    openai.js
    gemini.js
    perplexity.js            ← raw HTTP wrapper for api.perplexity.ai
  nodes/
    index.js                 ← NODE_REGISTRY (used by /test-node)
    inputNormalizer.js       projectMode.js
    genreToneRouter.js       buildWriterPanel.js
    draftContext.js          headWriter.js
    finalEditor.js           artDirector.js
    socialMediaDirector.js   futureStoryArc.js
    researcher.js            ← Perplexity researcher (runs in parallel)
    finalDispatch.js
    writers/
      _brainstorm.js         (shared logic; the 6 writers below all use it)
      comedy.js historic.js biographer.js scifi.js documentary.js action.js
  profiles/
    brands.js                ← BRAND_CONFIGS registry
    projectModes.js          ← PROJECT_MODE_CONFIGS + buildHeadWriterSystemMessage
  prompts/
    <see "Prompt files" above for the full layout>

src/services/writersRoom.cron.js
src/services/tonkaSparkPost.service.js  ← saveTonkaSparkPost (shared by webhook + orchestrator)
src/models/writersRoomIdeaCursor.model.js
src/models/writersRoomRun.model.js      ← runs archive schema + TTL index
src/controllers/writersRoom/
  methods.js
  methods/
    writersRoom.controller.post.run.js
    writersRoom.controller.post.testNode.js
    writersRoom.controller.get.nextIdea.js
    writersRoom.controller.get.runs.js     ← GET /api/writers-room/runs
    writersRoom.controller.get.runById.js  ← GET /api/writers-room/runs/:id
src/routes/writersRoom.routes.js
src/constants/writersroom.js   ← PIPELINE_NODE, cron schedule, defaults, error codes, RUN_STATUS
src/tests/writersRoom.llmKeys.spec.js   ← LLM key + model smoke test
SEASON-01-IDEAS.md             ← the rotation source (repo root)
```

## Environment variables

Add these to `.env`:

```
# Required for the Writer's Room to draft anything
OPENAI_API_KEY=…
GEMINI_API_KEY=…

# Only needed when enable_research: true
PERPLEXITY_API_KEY=…

# Optional — per-provider default models. Per-prompt meta.json wins when set.
OPENAI_MODEL=gpt-4o-mini             # default fallback when meta.model is null
GEMINI_MODEL=gemini-2.0-flash-lite   # default fallback when meta.model is null
PERPLEXITY_MODEL=sonar-pro           # used by the researcher node
ANTHROPIC_MODEL=claude-haiku-4-5     # not used by Writer's Room (other services)

# Arm the 06:00/14:00 cron
WRITERS_ROOM_CRON_ENABLED=false
```

**Model resolution precedence** (highest wins):

1. `overrides.model` passed to `callLlmFromPrompt()` — rare; mostly for tests
2. `prompts/<slug>/meta.json` `model` field — per-prompt specialization
3. Per-provider env var (`OPENAI_MODEL` / `GEMINI_MODEL` / `PERPLEXITY_MODEL` / `ANTHROPIC_MODEL`) — the floor; always set via the zod schema in [`config/env.js`](../../config/env.js) so this is never empty

This means **most prompts pin their own model** in `meta.json` (e.g. `gpt-5-chat-latest` for writers vs `gpt-4.1-mini` for the editor — the n8n flow's deliberate per-role specialization). The env vars are only the fallback for new prompts that don't yet specify, or for swapping a whole provider's default at once without editing 12 meta.json files.

All API keys are optional at boot. A pipeline run only fails on a missing key when it tries to call that specific provider. So you can iterate on writer prompts with just `OPENAI_API_KEY` + `GEMINI_API_KEY` set, and turn research on later once `PERPLEXITY_API_KEY` is added.
