import express from 'express';

import {
  listFeeds,
  updateFeed,
  upsertFeed,
} from '../controllers/tonkaDispatchFeeds/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// Apply Bearer token authentication to all Tonka Dispatch Feeds routes
router.use(verifyToken);

// ----------------------------------------------------------------------------
// POST Routes
// ----------------------------------------------------------------------------
router.post('/', upsertFeed);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/', listFeeds);

// ----------------------------------------------------------------------------
// PATCH Routes
// ----------------------------------------------------------------------------
router.patch('/:id', updateFeed);

// ----------------------------------------------------------------------------
export default router;
