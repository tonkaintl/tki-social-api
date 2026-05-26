import express from 'express';

import {
  createWritersRoomTell,
  deleteWritersRoomTell,
  getNextWritersRoomIdea,
  getWritersRoomRunById,
  getWritersRoomTellById,
  listWritersRoomRuns,
  listWritersRoomTells,
  runWritersRoom,
  testWritersRoomNode,
  updateWritersRoomTell,
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
// Run a single node in isolation.
router.post('/test-node', testWritersRoomNode);
// Create an AI-tells dictionary entry.
router.post('/tells', createWritersRoomTell);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/next-idea', getNextWritersRoomIdea);
router.get('/runs', listWritersRoomRuns);
router.get('/runs/:id', getWritersRoomRunById);
// /tells declared before /tells/:id so the param doesn't shadow the list route.
router.get('/tells', listWritersRoomTells);
router.get('/tells/:id', getWritersRoomTellById);

// ----------------------------------------------------------------------------
// PATCH Routes
// ----------------------------------------------------------------------------
router.patch('/tells/:id', updateWritersRoomTell);

// ----------------------------------------------------------------------------
// DELETE Routes
// ----------------------------------------------------------------------------
router.delete('/tells/:id', deleteWritersRoomTell);

// ----------------------------------------------------------------------------
export default router;
