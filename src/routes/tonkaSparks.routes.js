import express from 'express';

import {
  listTonkaSparks,
  updateTonkaSpark,
  upsertTonkaSpark,
} from '../controllers/tonkaSparks/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';
import { verifyEitherAuth } from '../middleware/auth.either.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// POST Routes
// ----------------------------------------------------------------------------
router.post('/', verifyToken, upsertTonkaSpark);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/', verifyEitherAuth, listTonkaSparks);

// ----------------------------------------------------------------------------
// PATCH Routes
// ----------------------------------------------------------------------------
router.patch('/:id', verifyToken, updateTonkaSpark);

// ----------------------------------------------------------------------------
export default router;
