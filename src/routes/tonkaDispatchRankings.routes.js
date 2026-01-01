import express from 'express';

import { listRankings } from '../controllers/tonkaDispatchRankings/methods.js';
import { verifyEitherAuth } from '../middleware/auth.either.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/', verifyEitherAuth, listRankings);

// ----------------------------------------------------------------------------
export default router;
