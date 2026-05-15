# Multi-Item HTML Generation Architecture (Controller -> HTML)

This document explains how this project generates multi-item email HTML end-to-end.
It is architecture-focused and intended to be reusable as a prompt/template for another codebase.

## 1) Goal and Scope

Goal: produce a single email-safe HTML body (`html_content`) from a multi-item draft.

Scope covered:

- Route and controller flow
- Service-layer orchestration and validation checks
- Data model shape and item edit rules
- HTML generation format and helper structure
- Error patterns and response shaping
- Reusable implementation blueprint for other projects

Not the focus:

- Visual design decisions
- Frontend UX details

## 2) Runtime Path (High-Level)

Multi HTML generation is not a single endpoint in practice; it is a staged pipeline:

1. Create draft (`POST /api/content/multi`)
2. Edit/confirm each item (`PATCH /api/content/multi/:id/items/:itemIndex`)
3. Edit broadcast fields/reorder (`PATCH /api/content/multi/:id`)
4. Generate HTML (`POST /api/content/multi/:id/generate`)

Why staged:

- Source item identity fields remain stable/locked
- Mutable copy fields can be edited safely
- Final generate is gated by strict checks (minimum items, all confirmed, subject present)

## 3) Route Layer and Middleware

Routes are declared in [src/routes/content.routes.js](src/routes/content.routes.js).

Key multi routes:

- `POST /multi` -> `createMulti`
- `PATCH /multi/:id/items/:itemIndex` -> `updateMultiItemController`
- `PATCH /multi/:id` -> `updateMultiController`
- `POST /multi/:id/generate` -> `generateMultiController`

All above routes use `verifyClerkToken` middleware.

## 4) Controller Responsibilities

### 4.1 Create Controller

File: [src/controllers/content/methods/content.controller.multi.create.js](src/controllers/content/methods/content.controller.multi.create.js)

Responsibilities:

- Validate `publication_id` exists in request body
- Log request keys
- Delegate to `createMultiBroadcast` service
- Return 201 with shaped multi draft response

### 4.2 Update Broadcast Controller

File: [src/controllers/content/methods/content.controller.multi.update.js](src/controllers/content/methods/content.controller.multi.update.js)

Responsibilities:

- Validate `publication_id` exists
- Load draft by id; return 404 if missing
- Enforce ownership (`draft.publication_id === publication_id`), else 403
- Delegate to `updateMultiBroadcast`

### 4.3 Update Item Controller

File: [src/controllers/content/methods/content.controller.multi.updateItem.js](src/controllers/content/methods/content.controller.multi.updateItem.js)

Responsibilities:

- Validate `publication_id` exists
- Load draft and enforce ownership (403 on mismatch)
- Delegate to `updateMultiItem`

### 4.4 Generate Controller

File: [src/controllers/content/methods/content.controller.multi.generate.js](src/controllers/content/methods/content.controller.multi.generate.js)

Responsibilities:

- Load draft by id; return 404 if missing
- Delegate to `generateMultiBroadcast`
- Return generated draft response

Important architecture note:

- Unlike update controllers, generate controller currently does not check `publication_id` ownership. Ownership is enforced by auth middleware plus draft id access assumptions, but not explicitly by publication check in this controller.

## 5) Service Layer: Core Generation Lifecycle

### 5.1 Create Multi Draft

File: [src/services/content/multi/createMultiBroadcast.js](src/services/content/multi/createMultiBroadcast.js)

Main checks:

- `publication_id` required
- `items` must be an array
- `items.length` must be between `MULTI_MIN_ITEMS` and `MULTI_MAX_ITEMS`
- Every item must include required identity fields: `stock_number`, `company_id`, `title`
- Duplicate `stock_number` rejected

Normalization:

- Converts all text-like fields to strings
- Sets `confirmed: false` for every item at creation
- `applyItemsOrder` keeps requested order and appends missing items to avoid dropping data

Generation at create-time:

- Calls `generateMultiBroadcastHtml(...)` to seed initial `html_content`
- Persists draft with:
  - `mode: "multi"`
  - `items`, `items_order`, `stock_numbers`
  - `status: "draft"`

### 5.2 Edit Item

File: [src/services/content/multi/updateMultiItem.js](src/services/content/multi/updateMultiItem.js)

Main checks:

- `itemIndex` must be non-negative integer
- Draft must exist and be `mode === "multi"`
- `itemIndex` must be in range

Mutation rules:

- Only `MULTI_ITEM_EDITABLE_FIELDS` are applied
- Boolean handling for `show_price_reduction`
- Other edited fields coerced to strings
- Save behavior marks item confirmed by default (`confirmed: true`) unless explicitly set false

Return shape:

- Updated item (via `shapeMultiItem`)
- `all_confirmed` boolean

### 5.3 Edit Broadcast

File: [src/services/content/multi/updateMultiBroadcast.js](src/services/content/multi/updateMultiBroadcast.js)

Main checks:

- Draft exists
- Draft is multi-mode

Mutation rules:

- Only `MULTI_BROADCAST_EDITABLE_FIELDS` are accepted
- For `items_order`:
  - must be array
  - must contain every current stock number (no add/remove through reorder)
  - reorders `items`, `items_order`, and `stock_numbers` consistently

### 5.4 Generate Final HTML

File: [src/services/content/multi/generateMultiBroadcast.js](src/services/content/multi/generateMultiBroadcast.js)

Hard gates before rendering:

- Draft exists (404)
- `mode === "multi"` (400 otherwise)
- `items` array exists and count >= `MULTI_MIN_ITEMS`
- Every item must be `confirmed === true`
- `subject_line` must exist

Render and persist:

- Converts item subdocs to plain objects
- Calls `generateMultiBroadcastHtml({ title, subject_line, preview_text, items })`
- Sets `status = "regenerated"`
- Saves and returns shaped response

## 6) Data Contract: Multi Draft and Item Shapes

Primary schema: [src/models/content.draft.model.js](src/models/content.draft.model.js)

### 6.1 Multi Draft Fields Used for Generation

- `mode`
- `title`
- `subject_line`
- `preview_text`
- `items[]`
- `items_order[]`
- `stock_numbers[]`
- `html_content`
- `status`

### 6.2 Item Fields

Identity/locked fields (conceptually immutable post-hydrate):

- `source_draft_id`
- `stock_number`
- `company_id`
- `title`
- `hero_image`
- `cta_url`
- `location_label`

Editable fields:

- `item_details`
- `preview_text`
- `price_string`
- `previous_price_string`
- `show_price_reduction`
- `price_reduction_label`

Workflow field:

- `confirmed`

Constants source: [src/constants/content-multi.js](src/constants/content-multi.js)

## 7) Response Shaping

File: [src/services/content/multi/shapeMultiDraftResponse.js](src/services/content/multi/shapeMultiDraftResponse.js)

Why this matters architecturally:

- API response shape is stable and explicit
- Derived field `all_confirmed` is computed in one place
- Item-level defaults are normalized at output edge

## 8) HTML Renderer Architecture

File: [src/services/content/html/generateMultiBroadcastHtml.js](src/services/content/html/generateMultiBroadcastHtml.js)

Renderer style strategy:

- Inline styles only
- Table-based HTML for email compatibility
- Escapes dynamic content via `escapeHtml`

Helper decomposition:

- `buildPriceCell(item)`
  - renders normal price or reduction pattern (`Reduced!`, previous strike-through, current price)
- `buildLocationPriceRow(item)`
  - right-aligned row wrapper around price content
- `buildItemCard(item, { isLast })`
  - image block
  - title/stock/preview/details blocks
  - location+price row
  - CTA button block
  - divider except on last card

Top-level render function:

- `generateMultiBroadcastHtml({ title, subject_line, preview_text, items })`
- Validates non-empty items array
- Maps each item through `buildItemCard`
- Wraps all cards in a bounded container div (`max-width: 600px`)

Current structural choice:

- Always stacked card layout (image row then content row)
- Image width is full container width with bounded max-height and object-fit behavior

Note:

- `buildHeader(...)` helper exists but is not currently injected into final returned HTML in the present implementation.

## 9) Error Handling Pattern

Pattern used across services:

- `throw Object.assign(new Error("message"), { status: <http> })`

Benefits:

- Keeps domain checks in service layer
- Lets global error middleware map to HTTP response
- Supports clear gate-specific failure messages

## 10) End-to-End Invariants

These invariants protect architecture correctness:

- Multi drafts must have bounded item count (`2..10`)
- Item identity keys are effectively immutable in edit APIs
- Generate cannot run until all items confirmed
- Reorder cannot add/remove items
- HTML is regenerated from persisted structured fields (not patched as raw HTML)
- Output HTML uses escaped dynamic values to reduce injection risk

## 11) Reusable Blueprint for Another Project

If replicating this architecture, keep this layering:

1. Controller layer

- request validation (required request context)
- ownership/security checks
- thin delegation to services

2. Domain service layer

- enforce all business invariants
- normalize incoming item data
- maintain status transitions (`draft` -> `regenerated`)
- never trust frontend-only checks

3. Renderer layer

- pure-ish function from structured domain object -> HTML string
- helper-based composition per content block
- centralized escaping helper

4. Output shaping layer

- stable response contract
- include derived state (for wizard UX)

5. Persistence model

- store both structured source fields and generated HTML snapshot
- keep reorder control fields explicit (`items_order`)

## 12) Prompt Seed You Can Reuse

Use this prompt in another project:

"Implement a multi-item email HTML generation pipeline with these constraints:

- Build with layered architecture: routes/controllers -> domain services -> html renderer -> response shaper.
- Store structured multi draft data and generated html snapshot separately.
- Enforce invariant checks in services (mode, item count min/max, per-item confirmation, required subject before generate).
- Support item-level editable fields and locked identity fields.
- Support broadcast-level reorder with strict no-add/no-remove semantics.
- Generate HTML from normalized structured fields only; never edit raw html directly.
- Use inline-styled, table-safe email HTML and escape all dynamic content.
- Return stable API response shape with derived all_confirmed and status transitions.
- Include clear status-coded errors for each gate failure."
