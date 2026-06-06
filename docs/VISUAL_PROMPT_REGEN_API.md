# Visual Prompt Regeneration API

Regenerate the **text prompt** of a single visual prompt on a Tonka Spark Post.
This does **not** generate an image — it rewrites the `prompt` string that you
later feed into an image tool (DALL·E, Midjourney, etc.). The new prompt is
grounded in the post's `final_draft`, so it actually reflects the article
instead of a generic template.

## Why this exists

The Art Director that originally writes the 5 prompts now reads the article and
varies by topic. This endpoint lets an editor **re-roll a single prompt** when
they don't love it — optionally switching its **tone/intent** or giving a
freeform steer — without re-running the whole Writers Room pipeline or touching
the other prompts.

## Authentication

Bearer token, same as every Tonka Spark Post route:

```
Authorization: Bearer <your-token>
```

---

## Endpoint

### Regenerate a Visual Prompt's Text

**`POST /api/tonka-spark-post/:id/visual-prompts/:promptId/regenerate`**

#### Path Parameters

| Parameter  | Type   | Required | Description                                              |
| ---------- | ------ | -------- | -------------------------------------------------------- |
| `id`       | string | Yes      | Post ID — accepts Mongo `_id` **or** UUID `content_id`   |
| `promptId` | string | Yes      | The visual prompt's `id` (e.g. `vp-01`)                  |

#### Request Body (all fields optional)

| Field          | Type   | Required | Description                                                                                             |
| -------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------- |
| `intent`       | string | No       | Tone to generate. One of `hero`, `detail`, `process`, `environment`, `metaphor`. Omit to keep the prompt's current intent. |
| `instructions` | string | No       | Freeform steer for this regeneration, e.g. `"emphasize the rust"` or `"show it at dusk"`. Max 2000 chars. |

An empty body `{}` is valid — it re-rolls the prompt using its existing intent.

#### Intent / tone meanings

| Intent        | What you get                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| `hero`        | The subject as a whole — the establishing, wide "money" shot.                |
| `detail`      | A tight close-up of one telling component or piece of evidence.             |
| `process`     | An action or step from the article caught mid-happening.                    |
| `environment` | The wider setting/context the subject lives in.                             |
| `metaphor`    | A literal, grounded visual contrast echoing the theme (old vs. new, etc.).  |

---

## Request Examples

### Re-roll keeping the same intent

```http
POST /api/tonka-spark-post/637d35f5-f372-4f58-b97e-b7929b7ca7a4/visual-prompts/vp-01/regenerate
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{}
```

### Switch the tone to "detail"

```http
POST /api/tonka-spark-post/637d35f5-f372-4f58-b97e-b7929b7ca7a4/visual-prompts/vp-01/regenerate
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{ "intent": "detail" }
```

### Switch tone + add a steer

```http
POST /api/tonka-spark-post/637d35f5-f372-4f58-b97e-b7929b7ca7a4/visual-prompts/vp-03/regenerate
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "intent": "environment",
  "instructions": "wide shot, overcast morning light, focus on the loading dock"
}
```

---

## Response

### Success (200 OK)

Returns the **single updated prompt** (including any images already attached —
images are untouched). Note `intent` reflects the effective intent used, and
`prompt` is the freshly generated text.

```json
{
  "message": "Visual prompt regenerated successfully",
  "content_id": "637d35f5-f372-4f58-b97e-b7929b7ca7a4",
  "prompt_id": "vp-01",
  "requestId": "a1b2c3",
  "visual_prompt": {
    "id": "vp-01",
    "intent": "detail",
    "prompt": "Tight close-up of ... (grounded in this article's subject)",
    "images": []
  }
}
```

### Error Responses

**404 — Post not found**

```json
{ "code": "NOT_FOUND", "error": "Tonka Spark Post not found: <id>" }
```

**404 — Prompt not found**

```json
{ "code": "NOT_FOUND", "error": "Visual prompt not found: vp-99" }
```

**400 — Validation error** (e.g. invalid `intent`)

```json
{
  "code": "VALIDATION_ERROR",
  "error": "Invalid request data",
  "details": [
    { "path": ["intent"], "message": "Invalid enum value..." }
  ]
}
```

**500 — Generation failed** (LLM returned nothing usable, key missing, etc.)

```json
{
  "code": "INTERNAL_SERVER_ERROR",
  "error": "Visual prompt generation returned no prompt text"
}
```

---

## Frontend Integration

### TypeScript types

```typescript
type VisualPromptIntent =
  | 'hero'
  | 'detail'
  | 'process'
  | 'environment'
  | 'metaphor';

interface RegenerateVisualPromptRequest {
  intent?: VisualPromptIntent; // omit to keep current intent
  instructions?: string; // optional freeform steer
}

interface VisualPrompt {
  id: string;
  intent: string;
  prompt: string;
  images: Array<{
    url: string;
    alt?: string;
    description?: string;
    filename?: string;
    size?: number;
    created_at: string;
  }>;
}

interface RegenerateVisualPromptResponse {
  message: string;
  content_id: string;
  prompt_id: string;
  requestId: string;
  visual_prompt: VisualPrompt;
}
```

### Client function

```typescript
async function regenerateVisualPrompt(
  postId: string,
  promptId: string,
  body: RegenerateVisualPromptRequest = {}
): Promise<RegenerateVisualPromptResponse> {
  const res = await fetch(
    `/api/tonka-spark-post/${postId}/visual-prompts/${promptId}/regenerate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to regenerate prompt');
  }

  return res.json();
}
```

### Typical UI flow

1. Render each visual prompt with its `intent` badge and `prompt` text.
2. Add a **"Regenerate"** button (re-roll same intent) and an intent dropdown
   (`hero / detail / process / environment / metaphor`) to change the tone.
3. Optionally expose an "extra direction" text field → `instructions`.
4. On submit, call `regenerateVisualPrompt(...)` and replace that one card with
   the returned `visual_prompt`. The other prompts and any attached `images`
   are not affected.

```tsx
const result = await regenerateVisualPrompt(post.content_id, prompt.id, {
  intent: selectedIntent, // optional
  instructions: extraDirection, // optional
});
updatePromptInState(result.visual_prompt);
```

---

## Notes for Developers

1. **Text only.** This endpoint never creates or deletes images. Attached
   `images` on the prompt are preserved across a regeneration. (After you like
   the new prompt, generate an image and attach it via the existing
   `POST .../images` endpoint — see `VISUAL_PROMPT_IMAGES_API.md`.)
2. **Operates on an existing prompt.** The `promptId` must already exist on the
   post (these are created by the Writers Room pipeline as `vp-01`, `vp-02`,
   …). It does not append a new prompt to the array.
3. **Intent persists.** If you pass a new `intent`, it is saved on the prompt —
   the next read reflects the new tone.
4. **Grounding.** The prompt is generated from the post's `final_draft`
   (`title`, `thesis`, `summary`, `draft_markdown`). If the draft is empty the
   call still succeeds but the result will be generic — make sure the post has
   a final draft first.
5. **ID flexibility.** `:id` accepts either the Mongo `_id` or the UUID
   `content_id`, same as the other Tonka Spark Post routes.
6. **Model.** Generation uses the `visualPromptRegen` prompt package
   (OpenAI, `gpt-5-mini` by default). Latency is a single LLM round-trip
   (typically a few seconds) — show a spinner on the card being regenerated.

---

## Related Endpoints

- `GET /api/tonka-spark-post/:id` — fetch the full post with all visual prompts
- `POST /api/tonka-spark-post/:id/visual-prompts/:promptId/images` — attach a generated image
- `POST /api/tonka-spark-post/:id/visual-prompts/:promptId/images/upload` — upload an image file
- `DELETE /api/tonka-spark-post/:id/visual-prompts/:promptId/images/:imageUrl` — remove an image
