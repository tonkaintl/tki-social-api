// TODO: Implement LinkedIn data normalization functions
// Convert LinkedIn API responses to our standard format

export function normalizeLinkedInPost(linkedInPost) {
  // TODO: Map LinkedIn post structure to NormalizedPost
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
    raw: linkedInPost,
    shareCount: 0,
  };
}

export function normalizeLinkedInWebhookEvent(event) {
  // TODO: Map LinkedIn webhook events to NormalizedEvent
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
