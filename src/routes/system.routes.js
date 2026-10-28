import express from 'express';

import { getReminders } from '../controllers/system/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Key-rotation reminders (Clerk bearer token required)
// ----------------------------------------------------------------------------
router.get('/reminders', verifyToken, getReminders);

// ----------------------------------------------------------------------------
export default router;
