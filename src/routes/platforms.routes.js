import express from 'express';

import { platformsMethods } from '../controllers/platforms/methods.js';

const router = express.Router();

// GET /api/platforms - Get supported social media platforms
router.get('/', platformsMethods.getPlatforms);

export default router;
