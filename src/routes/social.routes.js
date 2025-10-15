import express from 'express';

import {
  createSocialCampaign,
  createSocialComment,
  createSocialPost,
  fetchSocialPosts,
  getCampaignByStockNumber,
  getCampaignPreview,
  postItemToSocial,
  updateCampaign,
} from '../controllers/social/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// Apply Bearer token authentication to all social routes
router.use(verifyToken);

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
router.get('/campaigns', fetchSocialPosts); // List all campaigns with query params
router.get('/campaigns/:stockNumber/preview/:provider', getCampaignPreview); // Campaign preview for specific platform
router.get('/campaigns/:stockNumber', getCampaignByStockNumber); // Get specific campaign by stock number

// ----------------------------------------------------------------------------
// PUT Routes
// ----------------------------------------------------------------------------
router.put('/campaigns/:stockNumber', updateCampaign);

// ----------------------------------------------------------------------------
export default router;
