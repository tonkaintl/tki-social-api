import express from 'express';

import {
  createDispatchEntry,
  updateDispatchEntry,
} from '../controllers/dispatch/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// Apply Bearer token authentication to all dispatch routes
router.use(verifyToken);

// ----------------------------------------------------------------------------
// POST Routes
// ----------------------------------------------------------------------------
router.post('/', createDispatchEntry);

// ----------------------------------------------------------------------------
// PUT Routes
// ----------------------------------------------------------------------------
router.put('/:id', updateDispatchEntry);

// ----------------------------------------------------------------------------
export default router;
