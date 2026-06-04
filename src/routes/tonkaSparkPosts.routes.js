import express from 'express';

import {
  addVisualPromptImage,
  deleteVisualPromptImage,
  getTonkaSparkPostById,
  getTonkaSparkPostList,
  swapTonkaSparkPostTitle,
  toggleTonkaSparkPostUsed,
  updateFinalDraft,
  updateTonkaSparkPostTitle,
  uploadVisualPromptImage,
} from '../controllers/tonkaSparkPost/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';
import { uploadImage } from '../middleware/upload.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// Apply Bearer token authentication to all Tonka Spark Post routes
router.use(verifyToken);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/', getTonkaSparkPostList);
router.get('/:id', getTonkaSparkPostById);

// ----------------------------------------------------------------------------
// Final Draft Routes
// ----------------------------------------------------------------------------
router.patch('/:id/final-draft', updateFinalDraft);
router.patch('/:id/title', updateTonkaSparkPostTitle);
router.patch('/:id/title/swap', swapTonkaSparkPostTitle);
router.patch('/:id/used', toggleTonkaSparkPostUsed);

// ----------------------------------------------------------------------------
// Visual Prompts Routes
// ----------------------------------------------------------------------------
router.post('/:id/visual-prompts/:promptId/images', addVisualPromptImage);
router.post(
  '/:id/visual-prompts/:promptId/images/upload',
  uploadImage,
  uploadVisualPromptImage
);
router.delete(
  '/:id/visual-prompts/:promptId/images/:imageUrl',
  deleteVisualPromptImage
);

// ----------------------------------------------------------------------------
export default router;
