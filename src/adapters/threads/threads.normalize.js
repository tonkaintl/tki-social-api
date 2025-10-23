/**
 * Normalize Threads API post data to our standard format
 */
export function normalizeThreadsPost(threadsPost) {
  return {
    authorId: threadsPost.owner?.id || '',
    authorName: threadsPost.owner?.username || '',
    commentCount: threadsPost.replies_count || 0,
    createdAt: threadsPost.timestamp,
    id: threadsPost.id,
    likeCount: threadsPost.like_count || 0,
    mediaUrls: threadsPost.media_url ? [threadsPost.media_url] : [],
    message: threadsPost.text || '',
    permalink: threadsPost.permalink || '',
    raw: threadsPost,
    shareCount: threadsPost.quote_count || 0,
  };
}

/**
 * Normalize Threads webhook event data to our standard format
 */
export function normalizeThreadsWebhookEvent(change) {
  const { field, value } = change;

  // Handle different types of webhook events
  switch (field) {
    case 'replies':
      return normalizeThreadsReplyEvent(value);
    case 'mentions':
      return normalizeThreadsMentionEvent(value);
    default:
      // Unknown event type, skip
      return null;
  }
}

function normalizeThreadsReplyEvent(value) {
  const { id, media_id, text, timestamp } = value;

  return {
    authorId: value.from?.id || '',
    authorName: value.from?.username || '',
    content: text || '',
    id: id || '',
    postId: media_id || '',
    raw: value,
    timestamp: new Date(timestamp * 1000).toISOString(),
    type: 'reply',
  };
}

function normalizeThreadsMentionEvent(value) {
  const { id, media_id, timestamp } = value;

  return {
    authorId: '',
    authorName: '',
    content: 'Mentioned in thread',
    id: id || '',
    postId: media_id || '',
    raw: value,
    timestamp: new Date(timestamp * 1000).toISOString(),
    type: 'mention',
  };
}
