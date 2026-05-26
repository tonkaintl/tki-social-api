// ----------------------------------------------------------------------------
// Prompt loader — reads system.md, user.md, meta.json, and (optionally)
// schema.json out of src/services/writersRoom/prompts/<slug>/.
//
// Prompts use {{path.to.value}} placeholders (extracted from the n8n flow's
// {{$json["path"]["to"]["value"]}} syntax). Render with a context object.
//
// The orchestrator pre-computes any complex values (e.g. a JSON dump of the
// writer panel) and passes them in as flat keys, so the templating stays
// dead simple — no embedded JS expressions are evaluated at render time.
// ----------------------------------------------------------------------------

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { PIPELINE_ERROR_CODE } from '../../../constants/writersroom.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROMPTS_ROOT = path.resolve(__dirname, '..', 'prompts');

// In-process cache so we don't hit the filesystem every call. Restart the
// server (or call clearPromptCache from a test) to pick up edits.
const cache = new Map();

export function clearPromptCache() {
  cache.clear();
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function loadPrompt(slug) {
  if (cache.has(slug)) return cache.get(slug);

  const dir = path.join(PROMPTS_ROOT, slug);
  const [system, user, metaStr, schemaStr] = await Promise.all([
    readIfExists(path.join(dir, 'system.md')),
    readIfExists(path.join(dir, 'user.md')),
    readIfExists(path.join(dir, 'meta.json')),
    readIfExists(path.join(dir, 'schema.json')),
  ]);

  if (system === null && user === null) {
    const err = new Error(`Prompt package not found: ${slug}`);
    err.code = PIPELINE_ERROR_CODE.PROMPT_NOT_FOUND;
    throw err;
  }

  const meta = metaStr ? JSON.parse(metaStr) : {};
  const schema = schemaStr ? JSON.parse(schemaStr) : null;

  const pkg = {
    meta,
    schema,
    slug,
    system: system || '',
    user: user || '',
  };
  cache.set(slug, pkg);
  return pkg;
}

// Resolve a dotted path against a context object. Missing values render as
// empty string so a missing optional field doesn't crash the prompt.
function getPath(ctx, dotted) {
  return dotted.split('.').reduce((acc, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, ctx);
}

// Render {{path.to.value}} placeholders. Any residual `|| fallback`
// expressions left over from the n8n extraction are stripped; the caller
// should pre-populate the context with the value they want.
export function renderTemplate(template, ctx) {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, raw) => {
    // Drop everything after `||` (n8n inline fallback syntax we don't honor).
    const dotted = raw.split('||')[0].trim();
    // Skip {{ JSON.stringify(...) }} style blocks the extractor couldn't
    // simplify — the orchestrator should provide a flattened replacement
    // via a different placeholder. If we see one of these we leave it intact
    // so the LLM sees the literal (and a TODO is flagged in node code).
    if (
      dotted.startsWith('JSON.') ||
      dotted.startsWith('(') ||
      dotted.includes('(')
    ) {
      return match;
    }
    const val = getPath(ctx, dotted);
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  });
}

// Convenience: load + render system and user in one go.
export async function loadAndRender(slug, ctx) {
  const pkg = await loadPrompt(slug);
  return {
    meta: pkg.meta,
    schema: pkg.schema,
    slug,
    system: renderTemplate(pkg.system, ctx),
    user: renderTemplate(pkg.user, ctx),
  };
}
