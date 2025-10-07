/**
 * Convert LinkedIn API responses to our standard format
 */

/**
 * Normalize a LinkedIn UGC post to our standard format
 */
export function normalizeLinkedInPost(linkedInPost) {
  // Extract post content
  const shareContent =
    linkedInPost.specificContent?.['com.linkedin.ugc.ShareContent'];
  const message = shareContent?.shareCommentary?.text || '';

  // Extract author information
  const authorUrn = linkedInPost.author;
  const authorId =
    authorUrn
      ?.replace('urn:li:person:', '')
      .replace('urn:li:organization:', '') || '';

  // Extract engagement metrics
  const likeCount = linkedInPost.ugcSocialCounts?.numLikes || 0;
  const commentCount = linkedInPost.ugcSocialCounts?.numComments || 0;
  const shareCount = linkedInPost.ugcSocialCounts?.numShares || 0;

  // Extract media URLs if present
  const mediaUrls = [];
  if (shareContent?.media?.length > 0) {
    shareContent.media.forEach(mediaItem => {
      if (mediaItem.media && mediaItem.media.downloadUrl) {
        mediaUrls.push(mediaItem.media.downloadUrl);
      } else if (mediaItem.thumbnails?.length > 0) {
        mediaUrls.push(mediaItem.thumbnails[0].url);
      }
    });
  }

  // Generate permalink
  const postId = linkedInPost.id;
  const permalink = postId
    ? `https://www.linkedin.com/feed/update/${postId}/`
    : '';

  // Parse creation date
  const createdAt = linkedInPost.created?.time
    ? new Date(linkedInPost.created.time).toISOString()
    : new Date().toISOString();

  return {
    authorId,
    authorName: '', // LinkedIn doesn't return author name in UGC posts directly
    commentCount,
    createdAt,
    id: postId || '',
    likeCount,
    mediaUrls,
    message,
    permalink,
    raw: linkedInPost,
    shareCount,
  };
}

/**
 * Normalize a LinkedIn comment to our standard format
 */
export function normalizeLinkedInComment(linkedInComment) {
  const authorUrn = linkedInComment.actor;
  const authorId = authorUrn?.replace('urn:li:person:', '') || '';
  const message = linkedInComment.message?.text || '';
  const createdAt = linkedInComment.created?.time
    ? new Date(linkedInComment.created.time).toISOString()
    : new Date().toISOString();

  return {
    authorId,
    authorName: '', // LinkedIn doesn't return author name in comments directly
    createdAt,
    id: linkedInComment.id || '',
    likeCount: linkedInComment.socialCounts?.numLikes || 0,
    message,
    raw: linkedInComment,
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
