import express from 'express';

import { listArticles } from '../controllers/tonkaDispatchArticles/methods.js';
import { verifyEitherAuth } from '../middleware/auth.either.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/', verifyEitherAuth, listArticles);

// ----------------------------------------------------------------------------
export default router;
