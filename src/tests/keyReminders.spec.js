import { describe, expect, it } from 'vitest';

import { keyReminders } from '../services/keyReminders.service.js';

describe('keyReminders', () => {
  const now = new Date('2026-10-27T15:00:00Z');

  it('turns every *_EXPIRES into a row, soonest first, skipping bad dates', () => {
    const rows = keyReminders(
      {
        ANTHROPIC_API_KEY_EXPIRES: '2026-11-26',
        NOT_A_DATE_EXPIRES: 'next week',
        OLD_TOKEN_EXPIRES: '2026-10-20',
        SOON_TOKEN_EXPIRES: ' 2026-11-03 ',
        TODAY_TOKEN_EXPIRES: '2026-10-27',
        UNRELATED: '2026-10-27',
      },
      now
    );

    expect(rows.map(r => [r.key, r.level, r.days_left])).toEqual([
      ['OLD_TOKEN', 'expired', -7],
      ['TODAY_TOKEN', 'soon', 0],
      ['SOON_TOKEN', 'soon', 7],
      ['ANTHROPIC_API_KEY', 'later', 30],
    ]);
    expect(rows[3].message).toMatch(/set ANTHROPIC_API_KEY_EXPIRES/);
    expect(rows[0].message).toMatch(/it expired 2026-10-20/);
  });
});
