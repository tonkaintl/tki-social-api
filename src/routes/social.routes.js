import express from 'express';

import { platformsControllerGetPlatforms } from '../controllers/platforms/methods.js';
import {
  addCampaignMedia,
  createMetricoolDraft,
  createSocialCampaign,
  createSocialComment,
  deleteMetricoolPost,
  fetchCampaigns,
  getCampaignByStockNumber,
  getCampaignPreview,
  getCampaignsList,
  postCampaignToSocial,
  removeCampaignMedia,
  scheduleMetricoolPost,
  updateCampaign,
  updatePlatformContent,
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
router.post('/campaigns', createSocialCampaign);
router.post('/campaigns/:campaignId/metricool/draft', createMetricoolDraft);
router.post('/campaigns/:stockNumber/media', addCampaignMedia); // Add media to campaign portfolio
router.post('/campaigns/post-to-social', postCampaignToSocial);
router.post('/comment', createSocialComment);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/campaigns', fetchCampaigns);
router.get('/platforms', platformsControllerGetPlatforms);
router.get('/campaigns/:stockNumber/detail', getCampaignByStockNumber);
router.get('/campaigns/list', getCampaignsList);
router.get('/campaigns/:stockNumber/preview/:provider', getCampaignPreview);

// ----------------------------------------------------------------------------
// PUT Routes
// ----------------------------------------------------------------------------
router.put('/campaigns/:stockNumber', updateCampaign);

// ----------------------------------------------------------------------------
// PATCH Routes (Metricool)
// ----------------------------------------------------------------------------
router.patch('/campaigns/:campaignId/platform-content', updatePlatformContent); // Update platform-specific content and comments
router.patch(
  '/campaigns/:campaignId/metricool/:postId/schedule',
  scheduleMetricoolPost
);

// ----------------------------------------------------------------------------
// DELETE Routes
// ----------------------------------------------------------------------------
router.delete('/campaigns/:stockNumber/media/:mediaIndex', removeCampaignMedia); // Remove media from portfolio
router.delete('/campaigns/:campaignId/metricool/:postId', deleteMetricoolPost); // Delete Metricool post

// ----------------------------------------------------------------------------
export default router;
