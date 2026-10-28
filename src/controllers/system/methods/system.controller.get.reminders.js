import { keyReminders } from '../../../services/keyReminders.service.js';

// ----------------------------------------------------------------------------
// GET /api/system/reminders
// Key-rotation reminders built from every <NAME>_EXPIRES env var
// ----------------------------------------------------------------------------

export const getReminders = (req, res) => {
  return res.status(200).json({ data: keyReminders() });
};
