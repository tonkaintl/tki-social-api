import express from 'express';

import {
  enrichRankingById,
  enrichRankingsBatch,
  listCatalogArticles,
  listCatalogCategories,
  listRankings,
  testDispatchEmail,
} from '../controllers/tonkaDispatchRankings/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';
import { verifyEitherAuth } from '../middleware/auth.either.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/', verifyEitherAuth, listRankings);
router.get('/catalog/categories', verifyEitherAuth, listCatalogCategories);
router.get('/catalog/articles', verifyEitherAuth, listCatalogArticles);

// ----------------------------------------------------------------------------
// POST Routes
// ----------------------------------------------------------------------------
// Batch must be declared before :id to avoid param collision
router.post('/enrich/batch', verifyEitherAuth, enrichRankingsBatch);
router.post('/:id/enrich', verifyEitherAuth, enrichRankingById);

// Browser-facing test email: Clerk only, so the FE never holds a shared secret
router.post('/test-email', verifyToken, testDispatchEmail);

// ----------------------------------------------------------------------------
export default router;
