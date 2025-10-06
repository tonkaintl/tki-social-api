// TODO: Implement Reddit data normalization functions
// Convert Reddit API responses to our standard format

export function normalizeRedditPost(redditPost) {
  // TODO: Map Reddit post structure to NormalizedPost
  // Handle Reddit-specific fields like ups, downs, subreddit, etc.
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
    raw: redditPost,
    shareCount: 0,
  };
}

export function normalizeRedditWebhookEvent(event) {
  // TODO: Map Reddit events to NormalizedEvent
  // Note: Reddit doesn't have webhooks, this may be for polling-based events
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
