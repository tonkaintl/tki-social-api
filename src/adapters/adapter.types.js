/**
 * @typedef {Object} CreatePostInput
 * @property {string} pageIdOrHandle - Page ID or handle for the social account
 * @property {string} message - The message/content to post
 * @property {string} [linkUrl] - Optional URL to include in the post
 * @property {string[]} [mediaUrls] - Optional array of media URLs to attach
 * @property {string[]} [tags] - Optional array of tags/hashtags
 * @property {Object} [utm] - Optional UTM parameters for link tracking
 */

/**
 * @typedef {Object} CreatePostResult
 * @property {string} externalPostId - The ID assigned by the social platform
 * @property {string} permalink - Direct link to the created post
 * @property {'success'|'failed'} status - Whether the operation succeeded
 * @property {*} [raw] - Raw response from the provider (for debugging)
 */

/**
 * @typedef {Object} CreateCommentInput
 * @property {string} threadIdOrPostId - ID of the thread/post to comment on
 * @property {string} message - The comment message
 */

/**
 * @typedef {Object} CreateCommentResult
 * @property {string} externalCommentId - The ID assigned by the social platform
 * @property {'success'|'failed'} status - Whether the operation succeeded
 * @property {*} [raw] - Raw response from the provider (for debugging)
 */

/**
 * @typedef {Object} FetchPostsInput
 * @property {string} pageIdOrHandle - Page ID or handle for the social account
 * @property {string} [since] - ISO date string to fetch posts since
 * @property {number} [limit] - Maximum number of posts to fetch
 */

/**
 * @typedef {Object} NormalizedPost
 * @property {string} id - Post ID
 * @property {string} message - Post content/message
 * @property {string} createdAt - ISO date string when post was created
 * @property {string} permalink - Direct link to the post
 * @property {string} authorId - ID of the post author
 * @property {string} authorName - Name of the post author
 * @property {number} [likeCount] - Number of likes (if available)
 * @property {number} [commentCount] - Number of comments (if available)
 * @property {number} [shareCount] - Number of shares (if available)
 * @property {string[]} [mediaUrls] - Attached media URLs (if any)
 * @property {*} [raw] - Raw post data from provider
 */

/**
 * @typedef {Object} NormalizedEvent
 * @property {string} id - Event ID
 * @property {'comment'|'message'|'lead'|'mention'} type - Type of event
 * @property {string} timestamp - ISO date string when event occurred
 * @property {string} postId - Related post ID (if applicable)
 * @property {string} authorId - ID of the event author
 * @property {string} authorName - Name of the event author
 * @property {string} content - Event content (comment text, message, etc.)
 * @property {*} [raw] - Raw event data from provider
 */

/**
 * Base interface that all social media adapters must implement
 * This ensures consistent behavior across all providers
 */
export class SocialAdapter {
  constructor(provider, config = {}) {
    this.provider = provider;
    this.config = config;
  }

  /**
   * Create a new post on the social platform
   * @param {CreatePostInput} input
   * @returns {Promise<CreatePostResult>}
   */
  async createPost(_input) {
    throw new Error(`createPost not implemented for ${this.provider}`);
  }

  /**
   * Create a comment on an existing post/thread
   * @param {CreateCommentInput} input
   * @returns {Promise<CreateCommentResult>}
   */
  async createComment(_input) {
    throw new Error(`createComment not implemented for ${this.provider}`);
  }

  /**
   * Fetch posts from the social platform
   * @param {FetchPostsInput} input
   * @returns {Promise<NormalizedPost[]>}
   */
  async fetchPosts(_input) {
    throw new Error(`fetchPosts not implemented for ${this.provider}`);
  }

  /**
   * Handle incoming webhook events from the social platform
   * @param {import('express').Request} req - Express request object
   * @returns {Promise<NormalizedEvent[]>}
   */
  async handleWebhook(_req) {
    throw new Error(`handleWebhook not implemented for ${this.provider}`);
  }

  /**
   * Validate that the adapter is properly configured
   * @returns {Promise<boolean>}
   */
  async validateConfig() {
    throw new Error(`validateConfig not implemented for ${this.provider}`);
  }
}
