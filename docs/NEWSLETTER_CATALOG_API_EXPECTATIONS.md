# Newsletter Catalog API Expectations

This document describes the backend contract expected by the newsletter article picker UI.

## Purpose

The picker is no longer a batch-based ranking chooser. It should act like an article catalog so an editor can browse all available articles, filter by category, and add selected articles to a newsletter.

## UI Behavior the API Must Support

- Show category chips at the top of the dialog.
- Each category chip displays a count of available articles.
- Selecting a category clears the current list and loads the first page for that category.
- The article list is paged and supports infinite scroll.
- When the list reaches the end, the UI shows a final row such as `No more articles`.
- The dialog has a fixed max height and the article list scrolls inside the dialog.
- The user can select multiple articles and add them to the newsletter.
- Already-added newsletter articles may still be excluded by the frontend when needed, but the catalog endpoint should return the full available set for the selected category.

## Expected Endpoints

### 1. Category Summary

**GET** `/api/dispatch/rankings/catalog/categories`

Returns all categories that have available articles, along with counts.

Example response:

```json
{
  "categories": [
    { "category": "logistics", "count": 128 },
    { "category": "building-construction", "count": 84 },
    { "category": "marine", "count": 61 }
  ],
  "requestId": "..."
}
```

### 2. Category Articles

**GET** `/api/dispatch/rankings/catalog/articles?category=logistics&page=1&limit=25`

Returns a page of articles for one category.

Required behavior:

- `category` is required.
- `page` is 1-based.
- `limit` should be supported, with a practical default of `25`.
- Results must be ordered consistently, ideally by rank or a clearly defined sort.
- The response must include enough pagination metadata for the frontend to know whether to keep scrolling.

Example response:

```json
{
  "articles": [
    {
      "_id": "6823d1f6d7a4bb0012a1a001",
      "rank": 1,
      "title": "Example article title",
      "snippet": "Short summary text",
      "category": "logistics",
      "source_name": "Example Source",
      "creator": "Author Name",
      "link": "https://example.com/article",
      "og_image_url": "https://example.com/image.jpg",
      "pub_date_ms": 1778527145000
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "totalCount": 128,
    "hasMore": true
  },
  "requestId": "..."
}
```

## Response Expectations

The frontend expects article objects to include at least:

- `_id`
- `rank`
- `title`
- `category`
- `source_name`
- `snippet`
- `link`
- `creator`
- `og_image_url` when available
- `pub_date_ms` when available

If the backend uses different property names, it should either map them before returning or keep aliases stable so the frontend does not need category-specific special cases.

## Notes

- The old picker logic was batch-based and only loaded the latest batch. That behavior should not be used for the catalog picker.
- The catalog endpoints should be independent of newsletter selection state.
- The frontend will handle multi-select and submit selected article IDs back to the newsletter editor.
- If the backend returns a shorter page than `limit`, the frontend will treat that as the end of the list.
