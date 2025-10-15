import express from 'express';

import {
  createSocialCampaign,
  createSocialComment,
  createSocialPost,
  fetchSocialPosts,
  getCampaignByStockNumber,
  postItemToSocial,
  updateCampaign,
} from '../controllers/social/methods.js';
import { internalAuth } from '../middleware/auth.internal.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// Apply internal authentication to all social routes
router.use(internalAuth);

// ----------------------------------------------------------------------------
// POST Routes
// ----------------------------------------------------------------------------
router.post('/post', createSocialPost);
router.post('/campaigns', createSocialCampaign);
router.post('/post-item', postItemToSocial);
router.post('/comment', createSocialComment);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/fetch', fetchSocialPosts);
router.get('/campaigns', fetchSocialPosts); // Alias for better semantics
router.get('/campaigns/:stockNumber', getCampaignByStockNumber);

// ----------------------------------------------------------------------------
// PUT Routes
// ----------------------------------------------------------------------------
router.put('/campaigns/:stockNumber', updateCampaign);

// ----------------------------------------------------------------------------
export default router;
