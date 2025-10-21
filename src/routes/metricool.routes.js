import express from 'express';

import {
  createMetricoolDraft,
  deleteMetricoolPost,
  getAllMetricoolPosts,
  refreshMetricoolPosts,
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
router.post('/drafts', createMetricoolDraft);

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
export default router;
