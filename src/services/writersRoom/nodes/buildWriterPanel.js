// ----------------------------------------------------------------------------
// Build Writer Panel — port of n8n "Build Writer Panel" + "Writer Branch Hub".
//
// Takes the writers map from the Genre Tone Router and the array of note
// objects from each writer brainstorm. Returns:
//   writer_panel:  [ { role, weight }, ... ]  (only enabled writers, sorted)
//   writer_notes:  { role: { notes, weight }, ... }
//
// Plus the pre-rendered JSON strings the head writer prompt needs.
// ----------------------------------------------------------------------------

import { mergeByRole } from '../merge.js';

export function buildWriterPanel(ctx, writerResults) {
  const writers = ctx.writers || {};
  const panel = Object.entries(writers)
    .filter(([, cfg]) => cfg?.enabled)
    .map(([role, cfg]) => ({
      role,
      weight: typeof cfg.weight === 'number' ? cfg.weight : 0,
    }))
    .sort((a, b) => b.weight - a.weight);

  const writerNotes = mergeByRole(writerResults || []);

  return {
    ...ctx,
    writer_notes: writerNotes,
    writer_notes_json: JSON.stringify(writerNotes, null, 2),
    writer_panel: panel,
    writer_panel_json: JSON.stringify(panel, null, 2),
  };
}
