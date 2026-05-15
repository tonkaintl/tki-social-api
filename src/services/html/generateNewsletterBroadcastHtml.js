// ----------------------------------------------------------------------------
// generateNewsletterBroadcastHtml
// ----------------------------------------------------------------------------
// Pure renderer: takes normalized broadcast fields and produces an
// email-safe HTML string built from stacked <table> elements with all
// inline styles. No CSS classes, no media queries, no <div> for layout.
// ----------------------------------------------------------------------------

const CONTAINER_WIDTH = 600;

const STYLE = {
  body: [
    'margin:0',
    'padding:0',
    'background-color:#f4f4f5',
    'font-family:Arial,Helvetica,sans-serif',
    'color:#1f2937',
  ].join(';'),
  card: [
    'width:100%',
    'border:1px solid #e5e7eb',
    'background-color:#ffffff',
    'border-collapse:collapse',
  ].join(';'),
  cardOuterCell: 'padding:0 16px',
  cellPadded: 'padding:16px;vertical-align:top',
  ctaButton: [
    'display:inline-block',
    'padding:8px 14px',
    'font-size:13px',
    'line-height:16px',
    'color:#ffffff',
    'background-color:#c03e30',
    'text-decoration:none',
    'border-radius:4px',
  ].join(';'),
  divider: [
    'height:1px',
    'line-height:1px',
    'font-size:0',
    'background-color:#e5e7eb',
  ].join(';'),
  heroImage: [
    'display:block',
    'width:100%',
    'max-width:100%',
    'height:auto',
    'border:0',
    'outline:none',
    'text-decoration:none',
  ].join(';'),
  metaText: [
    'padding:12px 16px 0 16px',
    'font-size:12px',
    'line-height:16px',
    'color:#6b7280',
  ].join(';'),
  outerWrapper: [
    'width:100%',
    'background-color:#f4f4f5',
    'border-collapse:collapse',
  ].join(';'),
  snippetText: [
    'padding:10px 16px 0 16px',
    'font-size:14px',
    'line-height:20px',
    'color:#1f2937',
  ].join(';'),
  spacerCell: 'height:16px;line-height:16px;font-size:0',
  title: [
    'padding:16px 16px 10px 16px',
    'font-size:18px',
    'line-height:24px',
    'font-weight:600',
    'color:#111827',
  ].join(';'),
  titleText: 'margin:0;padding:0',
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pickDisplayTitle(item) {
  return item.custom_title && item.custom_title.trim().length > 0
    ? item.custom_title
    : item.title;
}

function pickDisplaySnippet(item) {
  return item.custom_snippet && item.custom_snippet.trim().length > 0
    ? item.custom_snippet
    : '';
}

function pickDisplayByline(item) {
  if (item.custom_byline && item.custom_byline.trim().length > 0) {
    return item.custom_byline;
  }
  const writer = item.writer || item.creator || item.author || '';
  const parts = [item.source_name, writer, item.published_label].filter(
    p => p && String(p).trim().length > 0
  );
  return parts.join(' • ');
}

// ----------------------------------------------------------------------------
// Block builders
// ----------------------------------------------------------------------------

function buildDividerRow() {
  return `<tr><td style="${STYLE.divider}">&nbsp;</td></tr>`;
}

function buildTitleRow(item) {
  const title = escapeHtml(pickDisplayTitle(item));
  return (
    `<tr><td style="${STYLE.title}">` +
    `<h2 style="${STYLE.titleText}">${title}</h2>` +
    `</td></tr>`
  );
}

function buildHeroImageRow(item) {
  if (!item.hero_image_url) return '';
  const alt = escapeHtml(pickDisplayTitle(item));
  return (
    `<tr><td style="padding:0">` +
    `<img src="${escapeHtml(item.hero_image_url)}" alt="${alt}" ` +
    `style="${STYLE.heroImage}" />` +
    `</td></tr>`
  );
}

function buildMetaRow(item) {
  const byline = escapeHtml(pickDisplayByline(item));

  if (!byline) return '';

  return `<tr><td style="${STYLE.metaText}">${byline}</td></tr>`;
}

function buildSnippetRow(item) {
  const snippet = escapeHtml(pickDisplaySnippet(item));

  if (!snippet) return '';

  return `<tr><td style="${STYLE.snippetText}">${snippet}</td></tr>`;
}

function buildCtaRow(item) {
  const ctaHref = escapeHtml(item.article_url || '#');

  return (
    `<tr><td style="padding:12px 16px 16px 16px;vertical-align:top">` +
    `<a href="${ctaHref}" target="_blank" rel="noopener noreferrer" ` +
    `style="${STYLE.ctaButton}">Open Article</a>` +
    `</td></tr>`
  );
}

function buildItemCard(item) {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
    `width="100%" style="${STYLE.card}">` +
    buildTitleRow(item) +
    buildHeroImageRow(item) +
    buildMetaRow(item) +
    buildSnippetRow(item) +
    buildCtaRow(item) +
    buildDividerRow() +
    `</table>`
  );
}

function buildCardRow(item, isLast) {
  const spacer = isLast
    ? ''
    : `<tr><td style="${STYLE.spacerCell}">&nbsp;</td></tr>`;

  return (
    `<tr><td style="${STYLE.cardOuterCell}">` +
    buildItemCard(item) +
    `</td></tr>` +
    spacer
  );
}

// ----------------------------------------------------------------------------
// Top-level renderer
// ----------------------------------------------------------------------------

export function generateNewsletterBroadcastHtml({
  items,
  preview_text,
  subject_line,
  title,
} = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('items must be a non-empty array'), {
      status: 400,
    });
  }

  const cards = items
    .map((item, idx) => buildCardRow(item, idx === items.length - 1))
    .join('');
  const previewSpan = preview_text
    ? `<span style="display:none;font-size:0;line-height:0;color:#f4f4f5;` +
      `mso-hide:all;max-height:0;overflow:hidden;">` +
      `${escapeHtml(preview_text)}</span>`
    : '';
  const safeTitle = escapeHtml(title || subject_line || 'Newsletter');

  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8" />` +
    `<meta name="viewport" content="width=device-width,initial-scale=1" />` +
    `<title>${safeTitle}</title></head>` +
    `<body style="${STYLE.body}">${previewSpan}` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
    `width="100%" style="${STYLE.outerWrapper}">` +
    `<tr><td style="${STYLE.spacerCell}">&nbsp;</td></tr>` +
    `<tr><td align="center" style="padding:0">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
    `width="${CONTAINER_WIDTH}" style="width:${CONTAINER_WIDTH}px;border-collapse:collapse">` +
    `${cards}` +
    `</table>` +
    `</td></tr>` +
    `<tr><td style="${STYLE.spacerCell}">&nbsp;</td></tr>` +
    `</table></body></html>`
  );
}
