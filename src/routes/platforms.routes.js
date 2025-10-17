import express from 'express';

import { platformsControllerGetPlatforms } from '../controllers/platforms/methods.js';

const router = express.Router();

// GET /api/platforms - Get supported social media platforms
router.get('/', platformsControllerGetPlatforms);

export default router;
