import express from 'express';

import {
  addVisualPromptImage,
  deleteVisualPromptImage,
  getTonkaSparkPostById,
  getTonkaSparkPostList,
} from '../controllers/tonkaSparkPost/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';

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
// Visual Prompts Routes
// ----------------------------------------------------------------------------
router.post('/:id/visual-prompts/:promptId/images', addVisualPromptImage);
router.delete(
  '/:id/visual-prompts/:promptId/images/:imageUrl',
  deleteVisualPromptImage
);

// ----------------------------------------------------------------------------
export default router;
