import express from 'express';

import {
  listFeeds,
  updateFeed,
  upsertFeed,
} from '../controllers/tonkaDispatchFeeds/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';
import { verifyEitherAuth } from '../middleware/auth.either.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// POST Routes
// ----------------------------------------------------------------------------
router.post('/', verifyToken, upsertFeed);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/', verifyEitherAuth, listFeeds);

// ----------------------------------------------------------------------------
// PATCH Routes
// ----------------------------------------------------------------------------
router.patch('/:id', verifyToken, updateFeed);

// ----------------------------------------------------------------------------
export default router;
