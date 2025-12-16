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
  handleTonkaDispatchDraft,
  handleWritersRoomAds,
  handleWritersRoomContent,
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
import { verifyN8nSecret } from '../middleware/auth.n8n.js';
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
router.post('/meta', handleMetaWebhook);

// ----------------------------------------------------------------------------
// Instagram Webhook Routes
// ----------------------------------------------------------------------------
router.get('/instagram', verifyInstagramWebhook);
router.post('/instagram', handleInstagramWebhook);

// ----------------------------------------------------------------------------
// Threads Webhook Routes
// ----------------------------------------------------------------------------
router.get('/threads', verifyThreadsWebhook);
router.post('/threads', handleThreadsWebhook);

// ----------------------------------------------------------------------------
// LinkedIn Webhook Routes
// ----------------------------------------------------------------------------
router.get('/linkedin', verifyLinkedInWebhook);
router.post('/linkedin', handleLinkedInWebhook);

// ----------------------------------------------------------------------------
// X (Twitter) Webhook Routes
// ----------------------------------------------------------------------------
router.get('/x', verifyXWebhook);
router.post('/x', handleXWebhook);

// ----------------------------------------------------------------------------
// Reddit Webhook Routes
// ----------------------------------------------------------------------------
router.get('/reddit', verifyRedditWebhook);
router.post('/reddit', handleRedditWebhook);

// ----------------------------------------------------------------------------
// TikTok Personal Webhook Routes
// ----------------------------------------------------------------------------
router.get('/tiktok-personal', verifyTikTokPersonalWebhook);
router.post('/tiktok-personal', handleTikTokPersonalWebhook);

// ----------------------------------------------------------------------------
// TikTok Business Webhook Routes
// ----------------------------------------------------------------------------
router.get('/tiktok-business', verifyTikTokBusinessWebhook);
router.post('/tiktok-business', handleTikTokBusinessWebhook);

// ----------------------------------------------------------------------------
// YouTube Webhook Routes
// ----------------------------------------------------------------------------
router.get('/youtube', verifyYouTubeWebhook);
router.post('/youtube', handleYouTubeWebhook);

// ----------------------------------------------------------------------------
// Facebook OAuth Callback
// ----------------------------------------------------------------------------
router.get('/facebook/callback', handleFacebookCallback);

// ----------------------------------------------------------------------------
// Writers Room Webhook Routes (Internal - requires x-internal-secret from n8n)
// ----------------------------------------------------------------------------
router.post('/writers-room/ads', verifyN8nSecret, handleWritersRoomAds);
router.post('/writers-room/content', verifyN8nSecret, handleWritersRoomContent);
router.post(
  '/writers-room/tonka-dispatch-draft',
  verifyN8nSecret,
  handleTonkaDispatchDraft
);

// ----------------------------------------------------------------------------
export default router;
