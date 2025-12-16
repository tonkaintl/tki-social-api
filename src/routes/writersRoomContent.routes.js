import express from 'express';

import {
  getWritersRoomContentById,
  getWritersRoomContentList,
} from '../controllers/writersRoomContent/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// Apply Bearer token authentication to all Writers Room content routes
router.use(verifyToken);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/', getWritersRoomContentList);
router.get('/:id', getWritersRoomContentById);

// ----------------------------------------------------------------------------
export default router;
