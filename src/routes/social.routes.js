import express from 'express';

import { platformsControllerGetPlatforms } from '../controllers/platforms/methods.js';
import {
  addCampaignMedia,
  addProposedPosts,
  createMetricoolDraft,
  createSocialCampaign,
  createSocialCampaignInternal,
  deleteMetricoolPost,
  deleteProposedPosts,
  fetchCampaigns,
  generateRssFeed,
  getCampaignByStockNumber,
  getCampaignByStockNumberInternal,
  getCampaignMedia,
  getCampaignPreview,
  postCampaignToSocial,
  removeCampaignMedia,
  replaceProposedPostMedia,
  scheduleMetricoolPost,
  updateCampaign,
  updateProposedPosts,
} from '../controllers/social/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';
import { verifyInternalSecret } from '../middleware/auth.internal.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// Public routes (no authentication required)
router.get('/rss', generateRssFeed);

// Internal service routes (x-internal-secret authentication)
router.post(
  '/campaigns/internal',
  verifyInternalSecret,
  createSocialCampaignInternal
);
router.get(
  '/campaigns/internal/:stockNumber',
  verifyInternalSecret,
  getCampaignByStockNumberInternal
);

// Apply Bearer token authentication to all other social routes
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
router.get('/campaigns/:stockNumber/media', getCampaignMedia);
router.get('/campaigns/:stockNumber/preview/:provider', getCampaignPreview);

// ----------------------------------------------------------------------------
// PUT Routes
// ----------------------------------------------------------------------------
router.put('/campaigns/:stockNumber', updateCampaign);
router.put(
  '/campaigns/:stockNumber/proposed-posts/:platform/media',
  replaceProposedPostMedia
);

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
router.delete('/campaigns/:stockNumber/media/:id', removeCampaignMedia);
router.delete('/campaigns/:stockNumber/metricool/:postId', deleteMetricoolPost);
// ----------------------------------------------------------------------------
export default router;
