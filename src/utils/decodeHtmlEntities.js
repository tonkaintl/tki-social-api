// ----------------------------------------------------------------------------
// decodeHtmlEntities — turn HTML-entity-encoded source text into plain text.
//
// Publisher markup (RSS feeds, OG/meta tags) encodes special characters as
// HTML entities: an apostrophe becomes &#39; or &rsquo;, an ampersand &amp;,
// a quote &quot;. If that text is stored raw, it surfaces two ways downstream:
//   1. Rendered as-is in the UI, showing literal "&#39;" / "&amp;" garbage.
//   2. Re-escaped by our email HTML builder (& -> &amp;), double-encoding an
//      already-encoded "&amp;" into "&amp;amp;".
// Both look random because they only appear when a given article's wording
// happens to contain one of these characters.
//
// The fix is to decode ONCE at the ingest boundary so everything stored is
// clean plain text. Downstream renderers (React, the newsletter escapeHtml)
// then encode exactly once, correctly. This is the single decode point for the
// whole pipeline — the frontend should never need to "mend" entities again.
//
// Handles named entities (common set), decimal (&#39;) and hex (&#x27;)
// numeric references. Unknown entities are left untouched rather than mangled.
// ----------------------------------------------------------------------------

// nbsp maps to a normal space (a raw U+00A0 causes odd spacing in titles).
const NAMED_ENTITIES = {
  amp: '&',
  apos: "'",
  bull: '•',
  copy: '©',
  dagger: '†',
  deg: '°',
  gt: '>',
  hellip: '…',
  laquo: '«',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '—',
  middot: '·',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  raquo: '»',
  rdquo: '”',
  reg: '®',
  rsquo: '’',
  trade: '™',
};

const ENTITY_RE = /&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi;

export function decodeHtmlEntities(value) {
  if (typeof value !== 'string') return value;
  // Fast path: no entity marker at all.
  if (value.indexOf('&') === -1) return value;

  return value.replace(ENTITY_RE, (match, entity) => {
    // Numeric reference: decimal (#39) or hex (#x27).
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const code = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (Number.isNaN(code)) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        // Out-of-range code point — leave the original text alone.
        return match;
      }
    }

    // Named reference. Try exact case first, then lowercase (be lenient about
    // &AMP; and friends), and leave anything unknown untouched.
    if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, entity)) {
      return NAMED_ENTITIES[entity];
    }
    const lower = entity.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, lower)) {
      return NAMED_ENTITIES[lower];
    }
    return match;
  });
}

export default decodeHtmlEntities;
