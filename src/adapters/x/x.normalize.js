// TODO: Implement X (Twitter) data normalization functions
// Convert X API v2 responses to our standard format

export function normalizeXPost(xPost) {
  // TODO: Map X tweet structure to NormalizedPost
  // Handle X-specific fields like retweet_count, reply_count, etc.
  return {
    authorId: '',
    authorName: '',
    commentCount: 0,
    createdAt: '',
    id: '',
    likeCount: 0,
    mediaUrls: [],
    message: '',
    permalink: '',
    raw: xPost,
    shareCount: 0,
  };
}

export function normalizeXWebhookEvent(event) {
  // TODO: Map X webhook events to NormalizedEvent
  // Handle mentions, replies, DMs, etc.
  return {
    authorId: '',
    authorName: '',
    content: '',
    id: '',
    postId: '',
    raw: event,
    timestamp: '',
    type: 'unknown',
  };
}
