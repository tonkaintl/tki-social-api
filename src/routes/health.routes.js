import express from 'express';

import { getHealth } from '../controllers/health/health.controller.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Health check endpoint (no authentication required)
// ----------------------------------------------------------------------------
router.get('/', getHealth);

// ----------------------------------------------------------------------------
export default router;
