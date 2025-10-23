/**
 * Normalize TikTok Personal API post data to our standard format
 */
export function normalizeTikTokPersonalPost(tiktokPost) {
  return {
    authorId: tiktokPost.author?.id || '',
    authorName: tiktokPost.author?.display_name || '',
    commentCount: tiktokPost.statistics?.comment_count || 0,
    createdAt: tiktokPost.create_time,
    id: tiktokPost.id,
    likeCount: tiktokPost.statistics?.like_count || 0,
    mediaUrls: tiktokPost.video?.cover ? [tiktokPost.video.cover] : [],
    message: tiktokPost.title || '',
    permalink: tiktokPost.share_url || '',
    raw: tiktokPost,
    shareCount: tiktokPost.statistics?.share_count || 0,
  };
}

/**
 * Normalize TikTok Personal webhook event data to our standard format
 */
export function normalizeTikTokPersonalWebhookEvent(event) {
  const { data, event_type } = event;

  // Handle different types of webhook events
  switch (event_type) {
    case 'comment':
      return normalizeTikTokPersonalCommentEvent(data);
    case 'video':
      return normalizeTikTokPersonalVideoEvent(data);
    default:
      // Unknown event type, skip
      return null;
  }
}

function normalizeTikTokPersonalCommentEvent(data) {
  const { comment_id, create_time, text, video_id } = data;

  return {
    authorId: data.user?.id || '',
    authorName: data.user?.display_name || '',
    content: text || '',
    id: comment_id || '',
    postId: video_id || '',
    raw: data,
    timestamp: new Date(create_time * 1000).toISOString(),
    type: 'comment',
  };
}

function normalizeTikTokPersonalVideoEvent(data) {
  const { create_time, video_id } = data;

  return {
    authorId: data.author?.id || '',
    authorName: data.author?.display_name || '',
    content: data.title || '',
    id: video_id || '',
    postId: video_id || '',
    raw: data,
    timestamp: new Date(create_time * 1000).toISOString(),
    type: 'video',
  };
}
