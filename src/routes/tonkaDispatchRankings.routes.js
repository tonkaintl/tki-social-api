import express from 'express';

import {
  enrichRankingById,
  enrichRankingsBatch,
  listCatalogArticles,
  listCatalogCategories,
  listRankings,
} from '../controllers/tonkaDispatchRankings/methods.js';
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

// ----------------------------------------------------------------------------
export default router;
