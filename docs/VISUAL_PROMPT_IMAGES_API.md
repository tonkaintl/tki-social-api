# Visual Prompt Image Upload API

API endpoint for uploading generated images to visual prompts within Writers Room entries.

## Overview

Each Writers Room entry contains multiple **visual prompts** (text descriptions for image generation). This endpoint allows you to attach generated images to specific prompts, creating a gallery of AI-generated visuals tied to each prompt.

## Authentication

Requires Bearer token authentication:

```
Authorization: Bearer <your-token>
```

---

## Endpoint

### Upload Image to Visual Prompt

Upload a generated image to a specific visual prompt within a Writers Room entry.

**Endpoint:** `POST /api/writers-room-entries/:id/visual-prompts/:promptId/images`

#### Path Parameters

| Parameter  | Type   | Required | Description                                                 |
| ---------- | ------ | -------- | ----------------------------------------------------------- |
| `id`       | string | Yes      | Entry ID (supports both MongoDB `_id` or UUID `content_id`) |
| `promptId` | string | Yes      | Visual prompt ID (e.g., `vp-01`, `vp-02`)                   |

#### Request Body

| Field         | Type   | Required | Description                                    |
| ------------- | ------ | -------- | ---------------------------------------------- |
| `imageUrl`    | string | **Yes**  | Full URL to the uploaded image                 |
| `alt`         | string | No       | Alt text for accessibility                     |
| `description` | string | No       | Description of the image or generation details |
| `filename`    | string | No       | Original filename                              |
| `size`        | number | No       | File size in bytes                             |

---

## Request Examples

### Basic Upload

```http
POST /api/writers-room-entries/637d35f5-f372-4f58-b97e-b7929b7ca7a4/visual-prompts/vp-01/images
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "imageUrl": "https://storage.example.com/images/truck-hero-001.jpg"
}
```

### Full Metadata Upload

```http
POST /api/writers-room-entries/6941ba1795cccd58f6ef351f/visual-prompts/vp-02/images
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "imageUrl": "https://cdn.example.com/generated/truck-detail-tire-worn.jpg",
  "alt": "Close-up of worn truck tire showing uneven tread wear and sidewall cracking",
  "description": "Generated using DALL-E 3 from 'detail' intent prompt. Focused on inspection documentation.",
  "filename": "truck-inspection-detail-001.jpg",
  "size": 245760
}
```

---

## Response

### Success Response (201 Created)

```json
{
  "message": "Image added to visual prompt successfully",
  "content_id": "637d35f5-f372-4f58-b97e-b7929b7ca7a4",
  "prompt_id": "vp-01",
  "image_count": 2,
  "added_image": {
    "url": "https://storage.example.com/images/truck-hero-001.jpg",
    "alt": "Three-quarter exterior view of used truck in sales yard",
    "description": "Generated using DALL-E 3",
    "filename": "truck-hero-001.jpg",
    "size": 245760,
    "created_at": "2025-12-16T20:45:00.000Z"
  }
}
```

### Error Responses

**404 Not Found - Entry Not Found**

```json
{
  "code": "NOT_FOUND",
  "error": "Writers Room entry not found: 637d35f5-f372-4f58-b97e-b7929b7ca7a4"
}
```

**404 Not Found - Prompt Not Found**

```json
{
  "code": "NOT_FOUND",
  "error": "Visual prompt not found: vp-99"
}
```

**400 Bad Request - Validation Error**

```json
{
  "code": "VALIDATION_ERROR",
  "error": "Invalid request data",
  "details": [
    {
      "code": "invalid_string",
      "path": ["imageUrl"],
      "message": "Valid URL is required"
    }
  ]
}
```

---

## Visual Prompt Structure

Each Writers Room entry contains an array of visual prompts. Here's the structure:

```typescript
interface VisualPrompt {
  id: string; // e.g., "vp-01", "vp-02"
  intent: string; // e.g., "hero", "detail", "process", "environment", "metaphor"
  prompt: string; // Full text prompt for image generation
  images: VisualPromptImage[]; // Array of uploaded images
}

interface VisualPromptImage {
  url: string;
  alt?: string;
  description?: string;
  filename?: string;
  size?: number;
  created_at: Date;
}
```

### Example Visual Prompts from Entry

```json
{
  "visual_prompts": [
    {
      "id": "vp-01",
      "intent": "hero",
      "prompt": "Three-quarter exterior view of a used Class 8 tractor parked in a sales/inspection yard...",
      "images": [
        {
          "url": "https://cdn.example.com/truck-hero-v1.jpg",
          "alt": "Used Class 8 truck exterior",
          "created_at": "2025-12-16T20:30:00Z"
        },
        {
          "url": "https://cdn.example.com/truck-hero-v2.jpg",
          "alt": "Used Class 8 truck exterior, alternate angle",
          "created_at": "2025-12-16T20:35:00Z"
        }
      ]
    },
    {
      "id": "vp-02",
      "intent": "detail",
      "prompt": "Tight close-up of a worn steering axle tire and wheel assembly...",
      "images": []
    }
  ]
}
```

---

## Frontend Integration

### TypeScript Types

```typescript
interface UploadImageRequest {
  imageUrl: string;
  alt?: string;
  description?: string;
  filename?: string;
  size?: number;
}

interface UploadImageResponse {
  message: string;
  content_id: string;
  prompt_id: string;
  image_count: number;
  added_image: {
    url: string;
    alt?: string;
    description?: string;
    filename?: string;
    size?: number;
    created_at: string;
  };
}
```

### Upload Function

```typescript
async function uploadVisualPromptImage(
  entryId: string,
  promptId: string,
  imageData: UploadImageRequest
): Promise<UploadImageResponse> {
  const response = await fetch(
    `/api/writers-room-entries/${entryId}/visual-prompts/${promptId}/images`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(imageData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload image');
  }

  return response.json();
}
```

### Usage Example

```typescript
// User generates an image from a visual prompt
const entry = await fetchWritersRoomEntry(
  '637d35f5-f372-4f58-b97e-b7929b7ca7a4'
);

// Find the prompt they want to generate an image for
const heroPrompt = entry.visual_prompts.find(p => p.intent === 'hero');

// After generating the image (e.g., using DALL-E, Midjourney, etc.)
const generatedImageUrl = 'https://cdn.example.com/generated-truck-hero.jpg';

// Upload it to the prompt
const result = await uploadVisualPromptImage(
  entry.content_id,
  heroPrompt.id, // "vp-01"
  {
    imageUrl: generatedImageUrl,
    alt: 'Used Class 8 truck in sales yard',
    description: 'Generated using DALL-E 3 from Writers Room hero prompt',
    size: 245760,
  }
);

console.log(
  `Image uploaded! Total images for this prompt: ${result.image_count}`
);
```

---

## Workflow: From Prompt to Image

1. **Fetch Entry**: Get Writers Room entry with visual prompts

   ```typescript
   const entry = await fetchWritersRoomEntry(entryId);
   ```

2. **Display Prompts**: Show user the visual prompts with intent/prompt text

   ```tsx
   {
     entry.visual_prompts.map(prompt => (
       <PromptCard key={prompt.id}>
         <h3>{prompt.intent}</h3>
         <p>{prompt.prompt}</p>
         <button onClick={() => generateImage(prompt)}>Generate Image</button>
       </PromptCard>
     ));
   }
   ```

3. **Generate Image**: User generates image using AI tool (DALL-E, Midjourney, etc.)
   - Copy the prompt text
   - Generate in external tool
   - Upload image to your storage (S3, Azure Blob, etc.)
   - Get public URL

4. **Upload to Prompt**: Attach the generated image to the specific prompt

   ```typescript
   await uploadVisualPromptImage(entry.content_id, prompt.id, {
     imageUrl: uploadedUrl,
     alt: 'Generated image description',
   });
   ```

5. **Display Gallery**: Show all uploaded images for each prompt
   ```tsx
   {
     prompt.images.map(img => (
       <img key={img.created_at} src={img.url} alt={img.alt} />
     ));
   }
   ```

---

## Multiple Images Per Prompt

Each visual prompt can have **multiple images**:

- Generate different variations
- Try different AI models
- A/B test different styles
- Keep revision history

Images are stored in the order they're uploaded (`created_at` timestamp).

**Example:**

```
vp-01 (hero intent)
  ├─ truck-hero-v1.jpg     (First attempt)
  ├─ truck-hero-v2.jpg     (Adjusted lighting)
  └─ truck-hero-final.jpg  (Final version)

vp-02 (detail intent)
  ├─ tire-closeup-v1.jpg
  └─ tire-closeup-v2.jpg
```

---

## Best Practices

### Image Storage

- **Upload to your own storage first** (S3, Azure Blob, Cloudinary, etc.)
- Get a **permanent public URL** before calling this endpoint
- Don't upload base64 or temporary URLs

### Metadata

- Always include `alt` text for accessibility
- Use `description` to note AI model, prompt variations, or generation settings
- Store `size` for tracking storage usage

### Error Handling

```typescript
try {
  const result = await uploadVisualPromptImage(entryId, promptId, imageData);
  showSuccessToast('Image uploaded successfully!');
} catch (error) {
  if (error.message.includes('not found')) {
    showErrorToast('Entry or prompt not found. Please refresh.');
  } else {
    showErrorToast('Failed to upload image. Please try again.');
  }
}
```

### Validation

- Validate `imageUrl` is a proper URL before sending
- Check file size before upload (recommend < 5MB)
- Verify prompt exists in entry before upload

---

## Notes for Developers

1. **Entry ID Flexibility**: The `:id` parameter accepts both:
   - MongoDB ObjectId: `6941ba1795cccd58f6ef351f`
   - UUID content_id: `637d35f5-f372-4f58-b97e-b7929b7ca7a4`

   Use whichever is convenient from your list view.

2. **Prompt IDs**: Visual prompt IDs follow the pattern `vp-01`, `vp-02`, etc. These are generated by the n8n Writers Room workflow.

3. **Image Deduplication**: The endpoint uses `$addToSet`, which prevents duplicate images with identical metadata. However, different URLs are treated as different images.

4. **Timestamps**: All timestamps are in ISO 8601 format with UTC timezone.

5. **No Image Deletion**: Currently, there's no DELETE endpoint for images. Images persist in the prompt's `images` array.

6. **Ordering**: Images are returned in the order they were added (by `created_at`).

---

## Common Use Cases

### Use Case 1: Content Editor Workflow

```
1. Writer reviews generated article
2. Sees 5 visual prompts for the article
3. Picks the "hero" prompt
4. Generates image in DALL-E using the prompt text
5. Downloads and uploads to CDN
6. Attaches image to prompt via API
7. Image now available for publishing workflow
```

### Use Case 2: Bulk Image Generation

```
1. Script fetches all entries with status="draft"
2. For each entry, iterate through visual_prompts
3. Generate images using automated AI service
4. Upload each generated image to corresponding prompt
5. Mark entry as "ready_for_review"
```

### Use Case 3: A/B Testing Visuals

```
1. Generate 3 different variations of hero image
2. Upload all 3 to the same prompt (vp-01)
3. Test which performs better in social media
4. Keep best performing image for final publication
```

---

## Related Endpoints

- `GET /api/writers-room-entries` - List all entries
- `GET /api/writers-room-entries/:id` - Get full entry with all prompts and images
- `POST /api/webhooks/writers-room/entries` - Webhook that creates entries with prompts

---

## Support

For issues or questions:

- Check that the entry exists and has visual prompts
- Verify the prompt ID matches exactly (case-sensitive)
- Ensure image URL is publicly accessible
- Confirm Bearer token is valid and not expired
