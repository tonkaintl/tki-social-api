import express from 'express';

import {
  getNextWritersRoomIdea,
  getWritersRoomRunById,
  listWritersRoomRuns,
  runWritersRoom,
  testWritersRoomNode,
} from '../controllers/writersRoom/methods.js';
import { verifyToken } from '../middleware/auth.bearer.js';

// ----------------------------------------------------------------------------
const router = express.Router();
// ----------------------------------------------------------------------------

router.use(verifyToken);

// ----------------------------------------------------------------------------
// POST Routes
// ----------------------------------------------------------------------------
// Run the full pipeline (n8n "Writer's Room" replacement).
router.post('/run', runWritersRoom);
// Run a single node in isolation. Lets you iterate on one prompt or
// transform without re-running everything upstream.
router.post('/test-node', testWritersRoomNode);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
// Peek the next idea in the SEASON-01-IDEAS.md rotation (no advance).
router.get('/next-idea', getNextWritersRoomIdea);

// Run history — mine failed runs for gems, audit cron output.
// /runs declared before /runs/:id so the param doesn't shadow the list route.
router.get('/runs', listWritersRoomRuns);
router.get('/runs/:id', getWritersRoomRunById);

// ----------------------------------------------------------------------------
export default router;
