// ----------------------------------------------------------------------------
// Merge helpers — replace the n8n "Merge" nodes (Merge Writer Notes,
// Attach Research To Notes, Merge Final Spark, Merge Citations,
// Merge Formatted Outputs, Merge for gDoc).
//
// In n8n those nodes do one of three things:
//   1. "Combine" — zip multiple parallel branches into one item by index
//   2. "Append" — concat branches into a single stream
//   3. "Merge By Position" — overlay fields from branch B onto branch A
//
// In script form, callers explicitly do what they need. These helpers
// make the intent obvious in the orchestrator.
// ----------------------------------------------------------------------------

// Combine results from N parallel branches into one object. Each branch
// returns either an object (merged shallow) or [key, value] (set on key).
// Useful for the 6 writer brainstorms: each returns { role, notes, weight }
// and we want { writer_notes: { comedy: {...}, action: {...} } }.
export function mergeByRole(results) {
  const out = {};
  for (const r of results) {
    if (!r) continue;
    if (r.role) out[r.role] = r;
  }
  return out;
}

// Shallow merge any number of objects into a new object (n8n "Merge by Position").
// Later args win.
export function overlayFields(...sources) {
  return Object.assign({}, ...sources.filter(Boolean));
}

// Deep merge — preserves nested objects. Used for context-shape merges
// where we don't want a setter to clobber sibling keys.
export function deepMerge(target, source) {
  if (!source) return target;
  if (!target) return source;
  const out = { ...target };
  for (const [key, val] of Object.entries(source)) {
    if (
      val !== null &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      typeof out[key] === 'object' &&
      !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(out[key], val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

// Append items from multiple branches into a flat array, skipping nullish.
export function appendBranches(...branches) {
  const out = [];
  for (const b of branches) {
    if (b == null) continue;
    if (Array.isArray(b)) out.push(...b.filter(x => x != null));
    else out.push(b);
  }
  return out;
}
