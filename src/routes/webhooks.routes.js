import express from 'express';

import {
  handleLinkedInWebhook,
  handleMetaWebhook,
  verifyLinkedInWebhook,
  verifyMetaWebhook,
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
// LinkedIn Webhook Routes
// ----------------------------------------------------------------------------
router.get('/linkedin', verifyLinkedInWebhook);
router.post('/linkedin', express.json(), handleLinkedInWebhook);

// ----------------------------------------------------------------------------
export default router;
