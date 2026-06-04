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
