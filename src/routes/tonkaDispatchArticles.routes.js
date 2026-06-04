import express from 'express';

import {
  listArticleCategories,
  listArticles,
  promoteArticle,
} from '../controllers/tonkaDispatchArticles/methods.js';
import { verifyEitherAuth } from '../middleware/auth.either.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
// Static path must be declared before the bare list route to avoid collisions.
router.get('/categories', verifyEitherAuth, listArticleCategories);
router.get('/', verifyEitherAuth, listArticles);

// ----------------------------------------------------------------------------
// POST Routes
// ----------------------------------------------------------------------------
// Manually promote a dispatch_article into a ranking (makes it enrichable).
router.post('/:id/promote', verifyEitherAuth, promoteArticle);

// ----------------------------------------------------------------------------
export default router;
