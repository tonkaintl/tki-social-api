import express from 'express';

import {
  addCampaignMedia,
  createMetricoolDraft,
  createSocialCampaign,
  createSocialComment,
  createSocialPost,
  fetchSocialPosts,
  getCampaignByStockNumber,
  getCampaignMedia,
  getCampaignPreview,
  getCampaignsList,
  postItemToSocial,
  removeCampaignMedia,
  scheduleMetricoolPost,
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
router.post('/campaigns/:campaignId/metricool/draft', createMetricoolDraft);
router.post('/post-item', postItemToSocial);
router.post('/comment', createSocialComment);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/fetch', fetchSocialPosts);
router.get('/campaigns', getCampaignsList); // Campaign listing with pagination
router.get('/campaigns/:stockNumber/preview/:provider', getCampaignPreview); // Campaign preview for specific platform
router.get('/campaigns/:stockNumber', getCampaignByStockNumber);
router.get('/campaigns/:stockNumber/media', getCampaignMedia); // Get campaign media portfolio

// ----------------------------------------------------------------------------
// PUT Routes
// ----------------------------------------------------------------------------
router.put('/campaigns/:stockNumber', updateCampaign);

// ----------------------------------------------------------------------------
// PATCH Routes (Metricool)
// ----------------------------------------------------------------------------
router.patch(
  '/campaigns/:campaignId/metricool/:postId/schedule',
  scheduleMetricoolPost
);

// ----------------------------------------------------------------------------
// POST Routes (Media Portfolio)
// ----------------------------------------------------------------------------
router.post('/campaigns/:stockNumber/media', addCampaignMedia); // Add media to campaign portfolio

// ----------------------------------------------------------------------------
// DELETE Routes
// ----------------------------------------------------------------------------
router.delete('/campaigns/:stockNumber/media/:mediaIndex', removeCampaignMedia); // Remove media from portfolio

// ----------------------------------------------------------------------------
export default router;
