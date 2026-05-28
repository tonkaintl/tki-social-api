import {
  IDEA_CATEGORY,
  IDEA_CATEGORY_VALUES,
  IDEA_STATUS_VALUES,
  PIPELINE_ERROR_CODE,
} from '../../../constants/writersroom.js';
import { createIdea } from '../../../services/writersRoom/ideas.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * POST /api/writers-room/ideas
 *
 * Body:
 *   {
 *     title:     string (required) — the story idea
 *     category:  commentary | vendor | buyer | culture | other (default commentary)
 *     season:    string (default "season_01")
 *     position:  number (default: append to end)
 *     status:    unused | in_progress | used | retired (default unused)
 *     notes:     string (optional)
 *   }
 */
export async function createWritersRoomIdea(req, res) {
  try {
    const { category, notes, position, season, status, title } = req.body || {};

    if (!title || String(title).trim() === '') {
      return res.status(400).json({
        code: 'MISSING_TITLE',
        message: 'title is required',
        requestId: req.id,
      });
    }
    if (category && !IDEA_CATEGORY_VALUES.includes(category)) {
      return res.status(400).json({
        code: 'INVALID_CATEGORY',
        message: `category must be one of: ${IDEA_CATEGORY_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }
    if (status && !IDEA_STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        code: 'INVALID_STATUS',
        message: `status must be one of: ${IDEA_STATUS_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }
    if (
      position !== undefined &&
      (typeof position !== 'number' || !Number.isFinite(position))
    ) {
      return res.status(400).json({
        code: 'INVALID_POSITION',
        message: 'position must be a finite number',
        requestId: req.id,
      });
    }

    const createdBy = req.authenticatedUser?.email || null;
    const idea = await createIdea(
      {
        category: category || IDEA_CATEGORY.COMMENTARY,
        notes: notes || '',
        ...(position !== undefined && { position }),
        ...(season && { season }),
        ...(status && { status }),
        title: String(title).trim(),
      },
      createdBy
    );

    return res.status(201).json({ idea, ok: true, requestId: req.id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        code: PIPELINE_ERROR_CODE.IDEAS_DUPLICATE,
        message: 'An idea with this title already exists in this season',
        requestId: req.id,
      });
    }
    logger.error('[WritersRoom] Create idea failed', {
      error: err.message,
      requestId: req.id,
    });
    return res.status(500).json({
      code: PIPELINE_ERROR_CODE.IDEAS_CRUD_FAILED,
      message: 'Failed to create idea',
      requestId: req.id,
    });
  }
}
