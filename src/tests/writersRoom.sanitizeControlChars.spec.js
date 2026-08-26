// ----------------------------------------------------------------------------
// Writer's Room — control-char sanitizer unit tests.
//
// LLMs sometimes emit malformed unicode escapes for smart punctuation
// (e.g. "" instead of "’"). JSON.parse decodes those into raw
// C0 control characters that then get persisted into draft_markdown. These
// tests pin the repair behavior. Control chars are built with
// String.fromCharCode so no literal control bytes live in the source.
// ----------------------------------------------------------------------------

import { describe, expect, it } from 'vitest';

import {
  deepHasControlChars,
  deepSanitize,
  hasControlChars,
  sanitizeText,
} from '../utils/sanitizeControlChars.js';

const c = code => String.fromCharCode(code);

describe('sanitizeText', () => {
  it('maps the quote-family control char (0x19) to an apostrophe', () => {
    const input = `seller${c(0x19)}s smile`;
    expect(sanitizeText(input)).toBe("seller's smile");
  });

  it('maps the dash-family control char (0x1f) to an em-dash', () => {
    const input = `too good${c(0x1f)}five figures`;
    expect(sanitizeText(input)).toBe('too good—five figures');
  });

  it('maps double-quote control chars (0x1c / 0x1d)', () => {
    const input = `${c(0x1c)}clean${c(0x1d)}`;
    expect(sanitizeText(input)).toBe('"clean"');
  });

  it('maps the hyphen family (0x10/0x11/0x12) to an ascii hyphen', () => {
    // These used to be stripped, welding words together in published drafts.
    expect(sanitizeText(`ultra${c(0x11)}rich`)).toBe('ultra-rich');
    expect(sanitizeText(`App${c(0x11)}based order`)).toBe('App-based order');
    expect(sanitizeText(`a 12${c(0x11)}month lead`)).toBe('a 12-month lead');
    expect(sanitizeText(`x${c(0x10)}y and p${c(0x12)}q`)).toBe('x-y and p-q');
  });

  it('never silently deletes a punctuation code point', () => {
    // Every code the high-byte drop can produce from the U+20xx punctuation
    // block must map to something visible — dropping one welds words together.
    for (const code of [0x10, 0x11, 0x12, 0x13, 0x14, 0x18, 0x19, 0x1c, 0x1d]) {
      expect(sanitizeText(`left${c(code)}right`)).not.toBe('leftright');
    }
  });

  it('strips unknown control chars instead of leaving them', () => {
    const input = `a${c(0x01)}b`;
    expect(sanitizeText(input)).toBe('ab');
  });

  it('preserves legitimate whitespace (tab / newline / CR)', () => {
    const input = `line1${c(0x09)}x\nline2\r`;
    expect(sanitizeText(input)).toBe(`line1${c(0x09)}x\nline2\r`);
  });

  it('leaves clean text untouched', () => {
    expect(sanitizeText('nothing to fix here')).toBe('nothing to fix here');
  });

  it('returns non-strings unchanged', () => {
    expect(sanitizeText(42)).toBe(42);
    expect(sanitizeText(null)).toBe(null);
  });
});

describe('deepSanitize', () => {
  it('sanitizes every string leaf in a nested object/array', () => {
    const input = {
      draft_markdown: `isn${c(0x19)}t paperwork${c(0x1f)}it${c(0x19)}s protection`,
      meta: { count: 3, nested: `a${c(0x1f)}b` },
      tags: [`one${c(0x19)}s`, 'clean'],
    };
    expect(deepSanitize(input)).toEqual({
      draft_markdown: "isn't paperwork—it's protection",
      meta: { count: 3, nested: 'a—b' },
      tags: ["one's", 'clean'],
    });
  });
});

// Real typographic punctuation must survive untouched. The sanitizer only
// exists to repair C0 control chars; if it ever starts "normalizing" real
// punctuation we get the corruption we were trying to prevent. Byte equality,
// not visual equality — these are the exact code points the writers emit.
describe('punctuation round trip', () => {
  const FIXTURE = [
    'soft­hyphen',
    'non‑breaking',
    'en–dash',
    'em—dash',
    'curly’s',
    '‘single’',
    '“double”',
    'ellipsis…',
  ].join(' | ');

  it('preserves every unicode punctuation mark byte-for-byte', () => {
    expect(sanitizeText(FIXTURE)).toBe(FIXTURE);
    expect(hasControlChars(FIXTURE)).toBe(false);
  });

  it('survives the JSON serialize/parse hop used on every write path', () => {
    const doc = {
      final_draft: { draft_markdown: FIXTURE, summary: FIXTURE },
      title_variations: [FIXTURE],
    };
    const roundTripped = JSON.parse(JSON.stringify(deepSanitize(doc)));
    expect(roundTripped.final_draft.draft_markdown).toBe(FIXTURE);
    expect(roundTripped.final_draft.summary).toBe(FIXTURE);
    expect(roundTripped.title_variations[0]).toBe(FIXTURE);
  });

  it('repairs control chars WITHOUT disturbing neighbouring punctuation', () => {
    const input = `it${c(0x19)}s a‑b “quoted”…`;
    expect(sanitizeText(input)).toBe("it's a‑b “quoted”…");
  });
});

describe('hasControlChars / deepHasControlChars', () => {
  it('detects control chars but ignores plain whitespace', () => {
    expect(hasControlChars(`x${c(0x19)}y`)).toBe(true);
    expect(hasControlChars('x\ty\nz')).toBe(false);
  });

  it('detects control chars anywhere in a nested structure', () => {
    expect(deepHasControlChars({ a: ['ok', { b: `x${c(0x1f)}y` }] })).toBe(
      true
    );
    expect(deepHasControlChars({ a: ['ok', { b: 'fine' }] })).toBe(false);
  });
});
