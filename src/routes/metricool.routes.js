import express from 'express';

import {
  createMetricoolBulkDraft,
  deleteMetricoolPost,
  getAllMetricoolPosts,
  refreshMetricoolPosts,
  updateMetricoolPost,
} from '../controllers/metricool/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// Apply Bearer token authentication to all Metricool routes
router.use(verifyToken);

// ----------------------------------------------------------------------------
// POST Routes
// ----------------------------------------------------------------------------
router.post('/bulk-drafts', createMetricoolBulkDraft);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/posts', getAllMetricoolPosts);
router.get('/refresh/:stockNumber', refreshMetricoolPosts);

// ----------------------------------------------------------------------------
// DELETE Routes
// ----------------------------------------------------------------------------
router.delete('/posts/:postId', deleteMetricoolPost);

// ----------------------------------------------------------------------------
// PUT Routes
// ----------------------------------------------------------------------------
router.put('/posts/:postId', updateMetricoolPost);

// ----------------------------------------------------------------------------
export default router;
