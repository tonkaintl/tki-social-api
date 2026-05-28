import {
  IDEA_CATEGORY_VALUES,
  IDEA_STATUS_VALUES,
  PIPELINE_ERROR_CODE,
} from '../../../constants/writersroom.js';
import { updateIdea } from '../../../services/writersRoom/ideas.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * PATCH /api/writers-room/ideas/:id
 *
 * Partial update. Any subset of
 * {title, category, season, position, status, notes} can be sent.
 */
export async function updateWritersRoomIdea(req, res) {
  try {
    const updates = {};
    const allowed = [
      'category',
      'notes',
      'position',
      'season',
      'status',
      'title',
    ];
    for (const key of allowed) {
      if (req.body && req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        code: 'NO_UPDATE_FIELDS',
        message: 'no updatable fields supplied',
        requestId: req.id,
      });
    }

    if (updates.category && !IDEA_CATEGORY_VALUES.includes(updates.category)) {
      return res.status(400).json({
        code: 'INVALID_CATEGORY',
        message: `category must be one of: ${IDEA_CATEGORY_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }
    if (updates.status && !IDEA_STATUS_VALUES.includes(updates.status)) {
      return res.status(400).json({
        code: 'INVALID_STATUS',
        message: `status must be one of: ${IDEA_STATUS_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }
    if (
      updates.position !== undefined &&
      (typeof updates.position !== 'number' ||
        !Number.isFinite(updates.position))
    ) {
      return res.status(400).json({
        code: 'INVALID_POSITION',
        message: 'position must be a finite number',
        requestId: req.id,
      });
    }
    if (updates.title) updates.title = String(updates.title).trim();

    const idea = await updateIdea(req.params.id, updates);
    if (!idea) {
      return res.status(404).json({
        code: PIPELINE_ERROR_CODE.IDEA_NOT_FOUND,
        message: 'Idea not found',
        requestId: req.id,
      });
    }
    return res.status(200).json({ idea, ok: true, requestId: req.id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        code: PIPELINE_ERROR_CODE.IDEAS_DUPLICATE,
        message: 'An idea with this title already exists in this season',
        requestId: req.id,
      });
    }
    logger.error('[WritersRoom] Update idea failed', {
      error: err.message,
      requestId: req.id,
    });
    return res.status(500).json({
      code: PIPELINE_ERROR_CODE.IDEAS_CRUD_FAILED,
      message: 'Failed to update idea',
      requestId: req.id,
    });
  }
}
