import express from 'express';

import {
  createSocialComment,
  createSocialPost,
  fetchSocialPosts,
  postItemToSocial,
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
router.post('/post-item', postItemToSocial);
router.post('/comment', createSocialComment);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/fetch', fetchSocialPosts);

// ----------------------------------------------------------------------------
export default router;
