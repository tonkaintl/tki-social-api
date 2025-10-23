/**
 * Normalize Instagram API post data to our standard format
 */
export function normalizeInstagramPost(instagramPost) {
  return {
    authorId: instagramPost.from?.id || '',
    authorName: instagramPost.from?.username || '',
    commentCount: instagramPost.comments_count || 0,
    createdAt: instagramPost.timestamp,
    id: instagramPost.id,
    likeCount: instagramPost.like_count || 0,
    mediaUrls: instagramPost.media_url ? [instagramPost.media_url] : [],
    message: instagramPost.caption || '',
    permalink: instagramPost.permalink || '',
    raw: instagramPost,
    shareCount: 0, // Instagram doesn't provide share count
  };
}

/**
 * Normalize Instagram webhook event data to our standard format
 */
export function normalizeInstagramWebhookEvent(change) {
  const { field, value } = change;

  // Handle different types of webhook events
  switch (field) {
    case 'comments':
      return normalizeInstagramCommentEvent(value);
    case 'mentions':
      return normalizeInstagramMentionEvent(value);
    default:
      // Unknown event type, skip
      return null;
  }
}

function normalizeInstagramCommentEvent(value) {
  const { id, media, text, timestamp } = value;

  return {
    authorId: value.from?.id || '',
    authorName: value.from?.username || '',
    content: text || '',
    id: id || '',
    postId: media?.id || '',
    raw: value,
    timestamp: new Date(timestamp * 1000).toISOString(),
    type: 'comment',
  };
}

function normalizeInstagramMentionEvent(value) {
  const { comment_id, media_id, timestamp } = value;

  return {
    authorId: '',
    authorName: '',
    content: 'Mentioned in comment',
    id: comment_id || '',
    postId: media_id || '',
    raw: value,
    timestamp: new Date(timestamp * 1000).toISOString(),
    type: 'mention',
  };
}
