// ----------------------------------------------------------------------------
// Metaphor-shot composition rotation.
//
// The `metaphor` intent is the one slot allowed to show two machines compared
// (worn vs clean, old vs new). It used to be described only as "beside" — a
// facing profile pair — which fails on any machine with a long appendage: two
// reach stackers, forklifts, boom lifts, telehandlers or cranes posed nose to
// nose have their booms/masts/forks overlap and tangle in the middle of the
// frame. The image model renders that as one unreadable machine.
//
// So the composition is CHOSEN HERE and injected into the prompt, exactly like
// the machine hint. Two reasons it lives in code rather than as a menu in the
// prompt: the model demonstrably drifts back to its default when simply offered
// options, and a code-side pick gives real rotation across runs.
//
// Every composition below stages the contrast WITHOUT putting two sets of
// working gear in the same airspace.
// ----------------------------------------------------------------------------

export const METAPHOR_COMPOSITIONS = [
  // Depth instead of width — the classic contrast, minus the collision.
  'the two machines staggered in depth and both facing the SAME direction — the ' +
    'clean one nearer the camera, the worn one parked behind it. Do NOT face them ' +
    'toward each other.',

  // Both turned toward the lens so any boom/mast/forks point away from each other.
  'both machines angled three-quarters toward the camera with a clear gap between ' +
    'them, booms lowered and forks/attachments down at ground level, so nothing ' +
    'from one machine crosses in front of the other.',

  // Sidesteps the two-machine problem entirely by cropping to the shared part.
  'a tight two-shot of the SAME single part on each machine — a worn tire beside a ' +
    'newer one, a scuffed bucket edge beside a clean one, a faded panel beside fresh ' +
    'paint. Only the parts are in frame, not the whole machines.',

  // Uses an existing row, so the spacing is the yard's problem, not the model's.
  'a row of the same machine type receding from the camera, the worn unit at the ' +
    'near end of the line and clean ones behind it, all parked facing the same way.',

  // Contrast by state rather than by adjacency.
  'one machine working out on the pad and an older, retired one parked well behind ' +
    'it in the back row — separated by open ground, not side by side.',

  // Over-the-shoulder depth framing.
  'the worn machine large in the foreground and slightly off to one side, with the ' +
    'clean one further back across the yard, clearly separated by open space.',
];

/**
 * Pick a metaphor composition at random.
 *
 * @param {string} [machine]  The chosen machine phrase. When it names something
 *   with a long boom, mast, or forks, the facing-profile-prone options are
 *   already excluded by construction — every entry avoids them — but this is
 *   kept as a hook for future machine-specific narrowing.
 * @returns {string} A composition instruction.
 */
export function randomMetaphorComposition() {
  return METAPHOR_COMPOSITIONS[
    Math.floor(Math.random() * METAPHOR_COMPOSITIONS.length)
  ];
}
