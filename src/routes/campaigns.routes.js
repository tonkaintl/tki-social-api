import express from 'express';

import {
  addCampaignMedia,
  addProposedPosts,
  createSocialCampaign,
  deleteProposedPosts,
  fetchCampaigns,
  generateRssFeed,
  getCampaignByStockNumber,
  getCampaignMedia,
  getCampaignPreview,
  postCampaignToSocial,
  removeCampaignMedia,
  replaceProposedPostMedia,
  updateCampaign,
  updateProposedPosts,
} from '../controllers/campaigns/methods.js';
import { platformsControllerGetPlatforms } from '../controllers/platforms/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// Public routes (no authentication required)
router.get('/rss', generateRssFeed);

// Apply Bearer token authentication to all other campaign routes
router.use(verifyToken);

// ----------------------------------------------------------------------------
// POST Routes
// ----------------------------------------------------------------------------
router.post('/', createSocialCampaign);
router.post('/:stockNumber/media', addCampaignMedia);
router.post('/post-to-social', postCampaignToSocial);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('', fetchCampaigns);
router.get('/platforms', platformsControllerGetPlatforms);
router.get('/:stockNumber/detail', getCampaignByStockNumber);
router.get('/:stockNumber/media', getCampaignMedia);
router.get('/:stockNumber/preview/:provider', getCampaignPreview);

// ----------------------------------------------------------------------------
// PUT Routes
// ----------------------------------------------------------------------------
router.put('/:stockNumber', updateCampaign);
router.put(
  '/:stockNumber/proposed-posts/:platform/media',
  replaceProposedPostMedia
);

// ----------------------------------------------------------------------------
// PATCH Routes
// ----------------------------------------------------------------------------
router.patch('/:stockNumber/add-proposed-posts', addProposedPosts);
router.patch('/:stockNumber/delete-proposed-posts', deleteProposedPosts);
router.patch('/:stockNumber/update-proposed-posts', updateProposedPosts);

// ----------------------------------------------------------------------------
// DELETE Routes
// ----------------------------------------------------------------------------
router.delete('/:stockNumber/media/:id', removeCampaignMedia);
// ----------------------------------------------------------------------------
export default router;
