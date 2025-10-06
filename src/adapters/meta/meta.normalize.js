/**
 * Normalize Meta Graph API post data to our standard format
 */
export function normalizeMetaPost(metaPost) {
  return {
    authorId: metaPost.from?.id || '',
    authorName: metaPost.from?.name || '',
    commentCount: metaPost.comments?.summary?.total_count || 0,
    createdAt: metaPost.created_time,
    id: metaPost.id,
    likeCount: metaPost.likes?.summary?.total_count || 0,
    mediaUrls: [], // TODO: Extract media URLs from attachments
    message: metaPost.message || '',
    permalink:
      metaPost.permalink_url || `https://www.facebook.com/${metaPost.id}`,
    raw: metaPost,
    shareCount: metaPost.shares?.count || 0,
  };
}

/**
 * Normalize Meta webhook event data to our standard format
 */
export function normalizeMetaWebhookEvent(change) {
  const { field, value } = change;

  // Handle different types of webhook events
  switch (field) {
    case 'feed':
      return normalizeMetaFeedEvent(value);
    case 'conversations':
      return normalizeMetaConversationEvent(value);
    case 'leadgen':
      return normalizeMetaLeadEvent(value);
    default:
      // Unknown event type, skip
      return null;
  }
}

function normalizeMetaFeedEvent(value) {
  const { created_time, from, item, message, post_id, verb } = value;

  let eventType;
  switch (verb) {
    case 'add':
      eventType = item === 'comment' ? 'comment' : 'post';
      break;
    case 'edited':
      eventType = 'edit';
      break;
    case 'hide':
      eventType = 'hide';
      break;
    default:
      eventType = 'unknown';
  }

  return {
    authorId: from?.id || '',
    authorName: from?.name || '',
    content: message || '',
    id: value.comment_id || post_id || value.photo_id || '',
    postId: post_id || '',
    raw: value,
    timestamp: new Date(created_time * 1000).toISOString(),
    type: eventType,
  };
}

function normalizeMetaConversationEvent(value) {
  const { created_time, message, thread_id } = value;

  return {
    authorId: message?.from?.id || '',
    authorName: message?.from?.name || '',
    content: message?.message || '',
    id: message?.mid || '',
    postId: thread_id || '',
    raw: value,
    timestamp: new Date(created_time).toISOString(),
    type: 'message',
  };
}

function normalizeMetaLeadEvent(value) {
  const { created_time, leadgen_id, page_id } = value;

  return {
    authorId: '',
    authorName: '',
    content: 'Lead generated',
    id: leadgen_id || '',
    postId: page_id || '',
    raw: value,
    timestamp: new Date(created_time * 1000).toISOString(),
    type: 'lead',
  };
}
