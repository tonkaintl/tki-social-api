import express from 'express';

import {
  addVisualPromptImage,
  deleteVisualPromptImage,
  getWritersRoomEntriesById,
  getWritersRoomEntriesList,
} from '../controllers/writersRoomEntries/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// Apply Bearer token authentication to all Writers Room entries routes
router.use(verifyToken);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/', getWritersRoomEntriesList);
router.get('/:id', getWritersRoomEntriesById);

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
