import express from 'express';

import { platformsControllerGetPlatforms } from '../controllers/platforms/methods.js';
import {
  addCampaignMedia,
  addProposedPosts,
  createMetricoolDraft,
  createSocialCampaign,
  deleteMetricoolPost,
  deleteProposedPosts,
  fetchCampaigns,
  getCampaignByStockNumber,
  getCampaignPreview,
  postCampaignToSocial,
  removeCampaignMedia,
  scheduleMetricoolPost,
  updateCampaign,
  updateProposedPosts,
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
router.post('/campaigns/:stockNumber/metricool/draft', createMetricoolDraft);
router.post('/campaigns/:stockNumber/media', addCampaignMedia);
router.post('/campaigns/post-to-social', postCampaignToSocial);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/campaigns', fetchCampaigns);
router.get('/platforms', platformsControllerGetPlatforms);
router.get('/campaigns/:stockNumber/detail', getCampaignByStockNumber);
router.get('/campaigns/:stockNumber/preview/:provider', getCampaignPreview);

// ----------------------------------------------------------------------------
// PUT Routes
// ----------------------------------------------------------------------------
router.put('/campaigns/:stockNumber', updateCampaign);

// ----------------------------------------------------------------------------
// PATCH Routes
// ----------------------------------------------------------------------------
router.patch('/campaigns/:stockNumber/add-proposed-posts', addProposedPosts);
router.patch(
  '/campaigns/:stockNumber/delete-proposed-posts',
  deleteProposedPosts
);
router.patch(
  '/campaigns/:stockNumber/update-proposed-posts',
  updateProposedPosts
);
router.patch(
  '/campaigns/:stockNumber/metricool/:postId/schedule',
  scheduleMetricoolPost
);

// ----------------------------------------------------------------------------
// DELETE Routes
// ----------------------------------------------------------------------------
router.delete('/campaigns/:stockNumber/media/:mediaIndex', removeCampaignMedia);
router.delete('/campaigns/:stockNumber/metricool/:postId', deleteMetricoolPost);
// ----------------------------------------------------------------------------
export default router;
