import express from 'express';

import {
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
export default router;
