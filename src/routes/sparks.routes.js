import express from 'express';

import {
  listSparks,
  updateSpark,
  upsertSpark,
} from '../controllers/sparks/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';
import { verifyEitherAuth } from '../middleware/auth.either.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// POST Routes
// ----------------------------------------------------------------------------
router.post('/', verifyToken, upsertSpark);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/', verifyEitherAuth, listSparks);

// ----------------------------------------------------------------------------
// PATCH Routes
// ----------------------------------------------------------------------------
router.patch('/:id', verifyToken, updateSpark);

// ----------------------------------------------------------------------------
export default router;
