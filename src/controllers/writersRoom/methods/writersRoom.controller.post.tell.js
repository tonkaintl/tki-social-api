import {
  TELL_CATEGORY_VALUES,
  TELL_PATTERN_TYPE,
  TELL_PATTERN_TYPE_VALUES,
  TELL_SEVERITY_VALUES,
} from '../../../constants/writersroom.js';
import { createTell } from '../../../services/writersRoom/aiTells.service.js';
import { logger } from '../../../utils/logger.js';

/**
 * POST /api/writers-room/tells
 *
 * Body:
 *   {
 *     pattern:       string (required) — the substring or regex
 *     category:      ai_tell | brand_forbidden | weasel_words | preamble
 *     severity:      low | medium | high (default medium)
 *     pattern_type:  substring (default) | regex
 *     active:        boolean (default true)
 *     notes:         string (optional) — why this was added
 *   }
 */
export async function createWritersRoomTell(req, res) {
  try {
    const {
      active,
      category,
      notes,
      pattern,
      pattern_type: patternType,
      severity,
    } = req.body || {};

    if (!pattern || String(pattern).trim() === '') {
      return res.status(400).json({
        code: 'MISSING_PATTERN',
        message: 'pattern is required',
        requestId: req.id,
      });
    }
    if (!category || !TELL_CATEGORY_VALUES.includes(category)) {
      return res.status(400).json({
        code: 'INVALID_CATEGORY',
        message: `category must be one of: ${TELL_CATEGORY_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }
    if (severity && !TELL_SEVERITY_VALUES.includes(severity)) {
      return res.status(400).json({
        code: 'INVALID_SEVERITY',
        message: `severity must be one of: ${TELL_SEVERITY_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }
    if (patternType && !TELL_PATTERN_TYPE_VALUES.includes(patternType)) {
      return res.status(400).json({
        code: 'INVALID_PATTERN_TYPE',
        message: `pattern_type must be one of: ${TELL_PATTERN_TYPE_VALUES.join(', ')}`,
        requestId: req.id,
      });
    }
    // For regex patterns, validate compilability up-front so the admin
    // sees the error here, not silently at pipeline-run time.
    if (patternType === TELL_PATTERN_TYPE.REGEX) {
      try {
        new RegExp(pattern, 'i');
      } catch (regexErr) {
        return res.status(400).json({
          code: 'INVALID_REGEX',
          message: `pattern is not a valid regex: ${regexErr.message}`,
          requestId: req.id,
        });
      }
    }

    const createdBy = req.authenticatedUser?.email || null;
    const tell = await createTell(
      {
        active: active !== undefined ? Boolean(active) : true,
        category,
        notes: notes || '',
        pattern: String(pattern).trim(),
        pattern_type: patternType || TELL_PATTERN_TYPE.SUBSTRING,
        severity: severity || 'medium',
      },
      createdBy
    );

    return res.status(201).json({ ok: true, requestId: req.id, tell });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        code: 'DUPLICATE_TELL',
        message: 'A tell with this pattern + category already exists',
        requestId: req.id,
      });
    }
    logger.error('[WritersRoom] Create tell failed', {
      error: err.message,
      requestId: req.id,
    });
    return res.status(500).json({
      code: 'TELLS_CREATE_FAILED',
      message: 'Failed to create tell',
      requestId: req.id,
    });
  }
}
