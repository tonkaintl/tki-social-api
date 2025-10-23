/**
 * Normalize YouTube API post data to our standard format
 */
export function normalizeYouTubePost(youtubePost) {
  return {
    authorId: youtubePost.snippet?.channelId || '',
    authorName: youtubePost.snippet?.channelTitle || '',
    commentCount: youtubePost.statistics?.commentCount || 0,
    createdAt: youtubePost.snippet?.publishedAt,
    id: youtubePost.id,
    likeCount: youtubePost.statistics?.likeCount || 0,
    mediaUrls: youtubePost.snippet?.thumbnails?.high?.url
      ? [youtubePost.snippet.thumbnails.high.url]
      : [],
    message: youtubePost.snippet?.description || '',
    permalink: `https://www.youtube.com/watch?v=${youtubePost.id}`,
    raw: youtubePost,
    shareCount: 0, // YouTube doesn't provide share count
  };
}

/**
 * Normalize YouTube webhook event data to our standard format
 */
export function normalizeYouTubeWebhookEvent(event) {
  const { entry } = event;

  if (!entry) {
    return null;
  }

  // YouTube uses Atom feed format for webhooks
  const videoId = entry['yt:videoId']?.[0];
  const channelId = entry['yt:channelId']?.[0];
  const published = entry.published?.[0];
  const updated = entry.updated?.[0];

  return {
    authorId: channelId || '',
    authorName: entry.author?.[0]?.name?.[0] || '',
    content: entry.title?.[0] || '',
    id: videoId || '',
    postId: videoId || '',
    raw: entry,
    timestamp: updated || published || new Date().toISOString(),
    type: 'video',
  };
}
