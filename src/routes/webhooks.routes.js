import express from 'express';

import {
  handleFacebookCallback,
  handleInstagramWebhook,
  handleLinkedInWebhook,
  handleMetaWebhook,
  handleRedditWebhook,
  handleThreadsWebhook,
  handleTikTokBusinessWebhook,
  handleTikTokPersonalWebhook,
  handleXWebhook,
  handleYouTubeWebhook,
  verifyInstagramWebhook,
  verifyLinkedInWebhook,
  verifyMetaWebhook,
  verifyRedditWebhook,
  verifyThreadsWebhook,
  verifyTikTokBusinessWebhook,
  verifyTikTokPersonalWebhook,
  verifyXWebhook,
  verifyYouTubeWebhook,
} from '../controllers/webhooks/methods.js';
import { webhookRateLimiter } from '../middleware/rateLimit.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// Apply webhook-specific rate limiting
router.use(webhookRateLimiter);

// ----------------------------------------------------------------------------
// Meta Webhook Routes
// ----------------------------------------------------------------------------
router.get('/meta', verifyMetaWebhook);
router.post('/meta', express.json(), handleMetaWebhook);

// ----------------------------------------------------------------------------
// Instagram Webhook Routes
// ----------------------------------------------------------------------------
router.get('/instagram', verifyInstagramWebhook);
router.post('/instagram', express.json(), handleInstagramWebhook);

// ----------------------------------------------------------------------------
// Threads Webhook Routes
// ----------------------------------------------------------------------------
router.get('/threads', verifyThreadsWebhook);
router.post('/threads', express.json(), handleThreadsWebhook);

// ----------------------------------------------------------------------------
// LinkedIn Webhook Routes
// ----------------------------------------------------------------------------
router.get('/linkedin', verifyLinkedInWebhook);
router.post('/linkedin', express.json(), handleLinkedInWebhook);

// ----------------------------------------------------------------------------
// X (Twitter) Webhook Routes
// ----------------------------------------------------------------------------
router.get('/x', verifyXWebhook);
router.post('/x', express.json(), handleXWebhook);

// ----------------------------------------------------------------------------
// Reddit Webhook Routes
// ----------------------------------------------------------------------------
router.get('/reddit', verifyRedditWebhook);
router.post('/reddit', express.json(), handleRedditWebhook);

// ----------------------------------------------------------------------------
// TikTok Personal Webhook Routes
// ----------------------------------------------------------------------------
router.get('/tiktok-personal', verifyTikTokPersonalWebhook);
router.post('/tiktok-personal', express.json(), handleTikTokPersonalWebhook);

// ----------------------------------------------------------------------------
// TikTok Business Webhook Routes
// ----------------------------------------------------------------------------
router.get('/tiktok-business', verifyTikTokBusinessWebhook);
router.post('/tiktok-business', express.json(), handleTikTokBusinessWebhook);

// ----------------------------------------------------------------------------
// YouTube Webhook Routes
// ----------------------------------------------------------------------------
router.get('/youtube', verifyYouTubeWebhook);
router.post('/youtube', express.json(), handleYouTubeWebhook);

// ----------------------------------------------------------------------------
// Facebook OAuth Callback
// ----------------------------------------------------------------------------
router.get('/facebook/callback', handleFacebookCallback);

// ----------------------------------------------------------------------------
export default router;
