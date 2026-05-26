import {
  TELL_CATEGORY_VALUES,
  TELL_PATTERN_TYPE,
  TELL_PATTERN_TYPE_VALUES,
  TELL_SEVERITY_VALUES,
} from '../../../constants/writersroom.js';
import { updateTell } from '../../../services/writersRoom/aiTells.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * PATCH /api/writers-room/tells/:id
 *
 * Partial update. Any subset of {pattern, category, severity,
 * pattern_type, active, notes} can be sent.
 */
export async function updateWritersRoomTell(req, res) {
  try {
    const updates = {};
    const allowed = [
      'active',
      'category',
      'notes',
      'pattern',
      'pattern_type',
      'severity',
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

    if (updates.category && !TELL_CATEGORY_VALUES.includes(updates.category)) {
      return res.status(400).json({
        code: 'INVALID_CATEGORY',
        message: `category must be one of: ${TELL_CATEGORY_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }
    if (updates.severity && !TELL_SEVERITY_VALUES.includes(updates.severity)) {
      return res.status(400).json({
        code: 'INVALID_SEVERITY',
        message: `severity must be one of: ${TELL_SEVERITY_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }
    if (
      updates.pattern_type &&
      !TELL_PATTERN_TYPE_VALUES.includes(updates.pattern_type)
    ) {
      return res.status(400).json({
        code: 'INVALID_PATTERN_TYPE',
        message: `pattern_type must be one of: ${TELL_PATTERN_TYPE_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }
    if (updates.pattern_type === TELL_PATTERN_TYPE.REGEX && updates.pattern) {
      try {
        new RegExp(updates.pattern, 'i');
      } catch (regexErr) {
        return res.status(400).json({
          code: 'INVALID_REGEX',
          message: `pattern is not a valid regex: ${regexErr.message}`,
          requestId: req.id,
        });
      }
    }
    if (updates.active !== undefined) updates.active = Boolean(updates.active);

    const tell = await updateTell(req.params.id, updates);
    if (!tell) {
      return res.status(404).json({
        code: 'TELL_NOT_FOUND',
        message: 'Tell not found',
        requestId: req.id,
      });
    }
    return res.status(200).json({ ok: true, requestId: req.id, tell });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        code: 'DUPLICATE_TELL',
        message: 'A tell with this pattern + category already exists',
        requestId: req.id,
      });
    }
    logger.error('[WritersRoom] Update tell failed', {
      error: err.message,
      requestId: req.id,
    });
    return res.status(500).json({
      code: 'TELLS_UPDATE_FAILED',
      message: 'Failed to update tell',
      requestId: req.id,
    });
  }
}
