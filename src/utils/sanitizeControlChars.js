// ----------------------------------------------------------------------------
// sanitizeControlChars — repair mangled typographic punctuation in text.
//
// Models occasionally emit malformed unicode escapes for smart punctuation
// inside their JSON: instead of U+2019 (right single quote) or U+2014 (em
// dash) they drop the 0x20 high byte and emit C0 control characters like
// U+0019 or U+001F. JSON.parse() throws on *raw* control bytes but happily
// decodes the *escape* (e.g. the six chars ) into the actual control
// char, so the garbage flows straight through into stored content (titles,
// draft_markdown, summaries) and gets persisted.
//
// Used both at the LLM-response boundary (so generated content is clean) and
// on write paths that accept user-edited text (so edits can't re-introduce
// the same garbage).
//
// We can't perfectly reconstruct intent (the same control char shows up for
// both an apostrophe and a dash depending on context), so we map by the
// dominant case and strip anything else. Real whitespace — tab (U+0009),
// line feed (U+000A), carriage return (U+000D) — is preserved.
//
// Keys are the bare code points the model emits after dropping the high byte
// (e.g. U+2019 -> 0x19), plus the observed 0x1F dash/quote variant. Quote
// codes map to straight ASCII (portable, and sidesteps the "smart quote" AI
// tell); dash codes map to an em-dash (the clear intent in observed output).
// ----------------------------------------------------------------------------

const REMAP = {
  0x13: '—', // en-dash family   -> em dash
  0x14: '—', // em-dash          -> em dash
  0x18: "'", // left single quote             -> apostrophe
  0x19: "'", // right single quote/apostrophe -> apostrophe
  0x1c: '"', // left double quote             -> double quote
  0x1d: '"', // right double quote            -> double quote
  0x1e: '—', // dash family      -> em dash
  0x1f: '—', // dash / closing quote (dominant: em dash)
};

const TAB = 0x09;
const LF = 0x0a;
const CR = 0x0d;

// A C0 control char (< 0x20) that is NOT legitimate whitespace.
function isStrippableControl(code) {
  return code < 0x20 && code !== TAB && code !== LF && code !== CR;
}

export function hasControlChars(value) {
  if (typeof value !== 'string') return false;
  for (let i = 0; i < value.length; i += 1) {
    if (isStrippableControl(value.charCodeAt(i))) return true;
  }
  return false;
}

export function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (!isStrippableControl(code)) {
      out += value[i];
      continue;
    }
    // Known smart-punctuation code -> its glyph; everything else is dropped.
    if (REMAP[code] !== undefined) out += REMAP[code];
  }
  return out;
}

// Escape raw (unescaped) control characters that appear INSIDE a JSON string
// literal so JSON.parse() will accept the text. Models without a native JSON
// mode sometimes emit a literal newline/tab inside a value (e.g. a multi-
// paragraph draft_text) instead of the required \n / \t escape — invalid JSON
// that throws "Bad control character in string literal". We can't strip the
// chars (we'd lose paragraph breaks in the prose) and can't blindly escape
// every control byte (structural newlines BETWEEN tokens must stay raw), so we
// walk the text tracking string context and only escape the bytes inside a
// string literal. Returns repaired JSON text, not a parsed value.
export function escapeJsonControlChars(text) {
  if (typeof text !== 'string') return text;
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      out += ch;
      inString = false;
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code < 0x20) {
      if (ch === '\n') out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (ch === '\t') out += '\\t';
      else out += `\\u${code.toString(16).padStart(4, '0')}`;
      continue;
    }
    out += ch;
  }
  return out;
}

// Walk an arbitrary parsed-JSON value and sanitize every string leaf.
export function deepSanitize(value) {
  if (typeof value === 'string') return sanitizeText(value);
  if (Array.isArray(value)) return value.map(deepSanitize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = deepSanitize(val);
    }
    return out;
  }
  return value;
}

// Returns true if any string leaf contains a control char worth fixing.
export function deepHasControlChars(value) {
  if (typeof value === 'string') return hasControlChars(value);
  if (Array.isArray(value)) return value.some(deepHasControlChars);
  if (value && typeof value === 'object') {
    return Object.values(value).some(deepHasControlChars);
  }
  return false;
}
