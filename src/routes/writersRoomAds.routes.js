import express from 'express';

import { getWritersRoomAdsByStockNumber } from '../controllers/writersRoomAds/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// Apply Bearer token authentication to all Writers Room ads routes
router.use(verifyToken);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/:stockNumber', getWritersRoomAdsByStockNumber);

// ----------------------------------------------------------------------------
export default router;
