import express from 'express';

import {
  createWritersRoomIdea,
  createWritersRoomTell,
  deleteWritersRoomIdea,
  deleteWritersRoomTell,
  getNextWritersRoomIdea,
  getWritersRoomIdeaById,
  getWritersRoomRunById,
  getWritersRoomTellById,
  listWritersRoomIdeas,
  listWritersRoomRuns,
  listWritersRoomTells,
  reorderWritersRoomIdeas,
  resetWritersRoomIdea,
  runWritersRoom,
  runWritersRoomNext,
  testWritersRoomNode,
  updateWritersRoomIdea,
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
// Fire-and-forget — claim next unused idea + run cron-style in background.
// Identical behavior to one cron fire (same env knobs, same forwarding).
router.post('/run-next', runWritersRoomNext);
// Run a single node in isolation.
router.post('/test-node', testWritersRoomNode);
// Idea bank — declared before the parametrized routes so /reorder doesn't
// get shadowed by /:id.
router.post('/ideas/reorder', reorderWritersRoomIdeas);
// Reset an idea back to status=unused (for re-running a topic after a bad run).
router.post('/ideas/:id/reset', resetWritersRoomIdea);
router.post('/ideas', createWritersRoomIdea);
// Create an AI-tells dictionary entry.
router.post('/tells', createWritersRoomTell);

// ----------------------------------------------------------------------------
// GET Routes
// ----------------------------------------------------------------------------
router.get('/next-idea', getNextWritersRoomIdea);
router.get('/runs', listWritersRoomRuns);
router.get('/runs/:id', getWritersRoomRunById);
// /ideas declared before /ideas/:id so the param doesn't shadow the list route.
router.get('/ideas', listWritersRoomIdeas);
router.get('/ideas/:id', getWritersRoomIdeaById);
// /tells declared before /tells/:id so the param doesn't shadow the list route.
router.get('/tells', listWritersRoomTells);
router.get('/tells/:id', getWritersRoomTellById);

// ----------------------------------------------------------------------------
// PATCH Routes
// ----------------------------------------------------------------------------
router.patch('/ideas/:id', updateWritersRoomIdea);
router.patch('/tells/:id', updateWritersRoomTell);

// ----------------------------------------------------------------------------
// DELETE Routes
// ----------------------------------------------------------------------------
router.delete('/ideas/:id', deleteWritersRoomIdea);
router.delete('/tells/:id', deleteWritersRoomTell);

// ----------------------------------------------------------------------------
export default router;
