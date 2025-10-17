# Metricool Sync & Model Refactor

## Overview

Major refactor to eliminate data duplication in `metricool_posts` model and add sync functionality to discover orphaned posts in Metricool.

## Problem Statement

1. **Data Duplication**: Fields stored both at top level AND in `metricool_response` object
2. **Orphaned Posts**: Posts exist in Metricool but not in our database
3. **Sync Issues**: Manual Metricool changes break system awareness

## Solution

### 1. Model Simplification

**Before (Duplicated Fields):**

```javascript
{
  metricool_id: "252906130",
  text: "🚗 RELIABLE WORKHORSE!...",           // DUPLICATE
  uuid: "6632916186918637371",                 // DUPLICATE
  metricool_creation_date: "2025-10-16...",    // DUPLICATE
  metricool_publication_date: "2025-12-08...", // DUPLICATE
  networks: ["facebook"],                      // DUPLICATE
  is_draft: true,                             // DUPLICATE
  creator_user_id: 4189470,                  // DUPLICATE
  creator_user_mail: "stephen@tonkaintl.com", // DUPLICATE
  auto_publish: false,                        // DUPLICATE
  media: [],                                  // DUPLICATE
  metricool_response: {
    text: "🚗 RELIABLE WORKHORSE!...",        // DUPLICATE
    uuid: "6632916186918637371",              // DUPLICATE
    creationDate: { dateTime: "2025-10-16..." }, // DUPLICATE
    publicationDate: { dateTime: "2025-12-08..." }, // DUPLICATE
    providers: [{ network: "facebook" }],     // DUPLICATE
    draft: true,                              // DUPLICATE
    creatorUserId: 4189470,                   // DUPLICATE
    creatorUserMail: "stephen@tonkaintl.com", // DUPLICATE
    autoPublish: false,                       // DUPLICATE
    media: []                                 // DUPLICATE
  }
}
```

**After (No Duplication):**

```javascript
{
  // Our business fields
  metricool_id: "252906130",
  stock_number: "21001",
  status: "draft",
  created_at: Date,
  updated_at: Date,

  // Metricool fields (explicitly set, no nesting)
  id: 252906130,
  text: "🚗 RELIABLE WORKHORSE!...",
  uuid: "6632916186918637371",
  creationDate: {
    dateTime: "2025-10-16T15:20:00",
    timezone: "America/Chicago"
  },
  publicationDate: {
    dateTime: "2025-12-08T10:00:00",
    timezone: "America/Chicago"
  },
  providers: [{
    network: "facebook",
    status: "PENDING",
    detailedStatus: "Pending"
  }],
  draft: true,
  autoPublish: false,
  creatorUserId: 4189470,
  creatorUserMail: "stephen@tonkaintl.com",
  media: [],
  twitterData: { type: "POST" },
  facebookData: { type: "POST" },
  instagramData: { autoPublish: false },
  linkedinData: { type: "POST" }
}
```

### 2. Sync Functionality

**New Endpoint Parameter:**

```
GET /api/social/metricool/posts/all?sync=true
```

**Behavior:**

- `sync=false` or omitted: Return Metricool data only (no DB operations)
- `sync=true`: Return Metricool data + sync all posts to database

### 3. Sync Process

1. Call Metricool API to get all posts
2. For each Metricool post:

   ```javascript
   const dbRecord = {
     // Our fields
     metricool_id: post.id.toString(),
     stock_number: null, // For orphaned posts
     status: post.draft ? 'draft' : 'scheduled',

     // Metricool fields (explicit mapping)
     id: post.id,
     text: post.text,
     uuid: post.uuid,
     creationDate: post.creationDate,
     publicationDate: post.publicationDate,
     providers: post.providers,
     draft: post.draft,
     autoPublish: post.autoPublish,
     creatorUserId: post.creatorUserId,
     creatorUserMail: post.creatorUserMail,
     media: post.media || [],
     twitterData: post.twitterData,
     facebookData: post.facebookData,
     instagramData: post.instagramData,
     linkedinData: post.linkedinData,
   };

   await MetricoolPosts.updateOne(
     { metricool_id: post.id.toString() },
     dbRecord,
     { upsert: true }
   );
   ```

3. Track sync results (created/updated counts)

### 4. Response Format

**Without Sync:**

```javascript
{
  "count": 6,
  "data": [...], // Metricool posts
  "message": "Metricool posts retrieved successfully",
  "success": true
}
```

**With Sync:**

```javascript
{
  "count": 6,
  "data": [...], // Same Metricool posts
  "message": "Metricool posts retrieved successfully",
  "success": true,
  "sync": {
    "enabled": true,
    "created": 2,
    "updated": 4,
    "orphaned": 1,
    "total": 6
  }
}
```

## Breaking Changes

### Model Schema Changes

**Fields Removed:**

- `text` → Use `text` field (from Metricool)
- `uuid` → Use `uuid` field (from Metricool)
- `metricool_creation_date` → Use `creationDate` field
- `metricool_publication_date` → Use `publicationDate` field
- `networks` → Use `providers` field
- `is_draft` → Use `draft` field
- `creator_user_id` → Use `creatorUserId` field
- `creator_user_mail` → Use `creatorUserMail` field
- `auto_publish` → Use `autoPublish` field
- `media` → Use `media` field (from Metricool)
- `media_alt_text` → No longer needed
- `publish_date` → Use `publicationDate` field
- `metricool_response` → Eliminated (fields now at top level)

**Fields Added:**

- `id` (Metricool's numeric ID)
- `creationDate` (Metricool's creation timestamp object)
- `publicationDate` (Metricool's publication timestamp object)
- `providers` (Metricool's provider array)
- `twitterData`, `facebookData`, `instagramData`, `linkedinData`
- All other Metricool response fields at top level

### Affected Controllers

**Files requiring updates:**

1. `social.controller.metricool.draft.js`
2. `social.controller.metricool.delete.js`
3. `social.controller.metricool.refresh.js`
4. `social.controller.metricool.schedule.js`
5. Any other files that query `metricool_posts`

**Field Access Changes:**

```javascript
// OLD
post.text;
post.uuid;
post.metricool_creation_date;
post.metricool_publication_date;
post.networks;
post.is_draft;

// NEW
post.text(same);
post.uuid(same);
post.creationDate.dateTime;
post.publicationDate.dateTime;
post.providers.map(p => p.network);
post.draft;
```

## Migration Strategy

1. **Create backup** of existing `metricool_posts` collection
2. **Update model schema** to new structure
3. **Update all controllers** to use new field names
4. **Test thoroughly** with existing data
5. **Run sync** to populate new structure
6. **Remove old fields** after validation

## Implementation Files

- `src/models/metricoolPosts.model.js` - Model schema changes
- `src/controllers/social/methods/social.controller.metricool.list.js` - Add sync logic
- All Metricool controllers - Update field references

## Benefits

1. **Eliminates data duplication** (~70% field reduction)
2. **Solves orphaned posts problem** (discovers posts created directly in Metricool)
3. **Maintains data consistency** (single source of truth)
4. **Improves performance** (smaller documents, fewer fields to index)
5. **Simplifies queries** (no nested object access)

## Risks

1. **Breaking change** for all Metricool controllers
2. **Data migration** required for existing records
3. **Potential data loss** if migration fails
4. **Testing complexity** across all affected endpoints
