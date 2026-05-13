import express from 'express';

import {
  createCampaign,
  getCampaign,
} from '../controllers/internal/methods.js';
import { testDispatchEmail } from '../controllers/tonkaDispatchRankings/methods.js';
import { verifyInternalSecret } from '../middleware/auth.internal.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// All internal routes require x-internal-secret authentication
router.use(verifyInternalSecret);

// ----------------------------------------------------------------------------
// POST Routes
// ----------------------------------------------------------------------------
router.post('/campaigns', createCampaign);
router.post('/dispatch-rankings/test-email', testDispatchEmail);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/campaigns/:stockNumber', getCampaign);

// ----------------------------------------------------------------------------
export default router;
