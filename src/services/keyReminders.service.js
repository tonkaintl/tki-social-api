// ----------------------------------------------------------------------------
// KEY ROTATION REMINDERS
// Every <NAME>_EXPIRES=YYYY-MM-DD env var is a reminder to rotate <NAME>
// (ANTHROPIC_API_KEY_EXPIRES → ANTHROPIC_API_KEY). A new *_EXPIRES needs no
// code change. The FE shows a global banner for the `soon` and `expired` levels.
// Ported from tki-beehiv-api/src/services/system.js.
// ----------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SOON_DAYS = 7;

// A key in words and where a new one is made; any other key is named by its variable.
const KEYS = {
  ANTHROPIC_API_KEY: {
    make: 'Make a new one at console.anthropic.com',
    words: 'the Anthropic (Claude) API key',
  },
  GEMINI_API_KEY: {
    make: 'Make a new one at aistudio.google.com/apikey',
    words: 'the Gemini API key',
  },
  OPENAI_API_KEY: {
    make: 'Make a new one at platform.openai.com',
    words: 'the OpenAI API key',
  },
  PERPLEXITY_API_KEY: {
    make: 'Make a new one at perplexity.ai/account/api',
    words: 'the Perplexity API key',
  },
};

/**
 * @param {Record<string, string|undefined>} env  process.env or a test stand-in
 * @param {Date} [now]
 * @returns {Array<{days_left: number, due: string, key: string, level: "later"|"soon"|"expired", message: string}>}
 *   soonest first; a malformed date is left out
 */
export function keyReminders(env = process.env, now = new Date()) {
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const out = [];

  for (const [name, raw] of Object.entries(env)) {
    if (!/^[A-Z0-9_]+_EXPIRES$/.test(name)) continue;
    const due = String(raw ?? '').trim();
    if (!DATE.test(due) || Number.isNaN(Date.parse(`${due}T00:00:00Z`)))
      continue;

    const key = name.slice(0, -'_EXPIRES'.length);
    const daysLeft = Math.round(
      (Date.parse(`${due}T00:00:00Z`) - today) / DAY_MS
    );
    const k = KEYS[key] ?? { make: 'Make a new one', words: key };
    out.push({
      days_left: daysLeft,
      due,
      key,
      level:
        daysLeft < 0 ? 'expired' : daysLeft <= SOON_DAYS ? 'soon' : 'later',
      message: `Rotate ${k.words} — ${daysLeft < 0 ? 'it expired' : 'it expires'} ${due}. ${k.make}, put it in .env and on Railway, and set ${name} to its new date.`,
    });
  }

  return out.sort(
    (a, b) => a.due.localeCompare(b.due) || a.key.localeCompare(b.key)
  );
}
