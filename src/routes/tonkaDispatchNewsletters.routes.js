import express from 'express';

import {
  addArticle,
  createNewsletter,
  deleteNewsletter,
  getNewsletter,
  listNewsletters,
  removeArticle,
  reorderArticles,
  updateArticle,
  updateNewsletter,
} from '../controllers/tonkaDispatchNewsletters/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';
import { verifyEitherAuth } from '../middleware/auth.either.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// POST Routes
// ----------------------------------------------------------------------------
router.post('/', verifyToken, createNewsletter);
router.post('/:id/articles', verifyToken, addArticle);
router.post('/:id/articles/reorder', verifyToken, reorderArticles);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/', verifyEitherAuth, listNewsletters);
router.get('/:id', verifyEitherAuth, getNewsletter);

// ----------------------------------------------------------------------------
// PATCH Routes
// ----------------------------------------------------------------------------
router.patch('/:id', verifyToken, updateNewsletter);
router.patch('/:id/articles/:article_id', verifyToken, updateArticle);

// ----------------------------------------------------------------------------
// DELETE Routes
// ----------------------------------------------------------------------------
router.delete('/:id', verifyToken, deleteNewsletter);
router.delete('/:id/articles/:article_id', verifyToken, removeArticle);

// ----------------------------------------------------------------------------
export default router;
