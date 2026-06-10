// ----------------------------------------------------------------------------
// Machine-hint rotation for visual prompts.
//
// Generic articles (about value, inspection, condition, the trade) never name
// a specific machine, so the Art Director kept defaulting to crawler
// excavators / dozers — which the image model (nano banana) also renders at the
// wrong scale. To break that bias we inject a concrete MACHINE HINT into the
// prompt context. The prompt uses it ONLY when the article doesn't center on
// its own machine/industry; an article that clearly names one wins.
//
// The hint is picked at RANDOM per run so machine choices stay varied instead
// of locking to one machine per article title. Within a single Art Director
// run the hint is resolved once and shared by all 5 prompts, so the set stays
// visually consistent; a separately re-rolled prompt may land on a different
// machine than its siblings (randomness is prioritized over re-roll coherence).
//
// `machineHintFor(seed)` is kept for callers that still want a deterministic,
// seed-stable pick (e.g. to deliberately match a previous run).
//
// Crawler excavators and dozers are intentionally excluded from the pool.
// ----------------------------------------------------------------------------

export const VISUAL_PROMPT_MACHINE_HINTS = [
  'a forklift in a warehouse',
  'a reach stacker at a container yard',
  'a combine harvester in a field',
  'a farm tractor with an implement',
  'a feller-buncher in a forestry cut',
  'a log loader at a timber landing',
  'a skidder on a logging site',
  'an all-terrain mobile crane on a job site',
  'a rough-terrain scissor lift on a site',
  'a telescopic boom lift on a site',
  'a harbor tug at a dock',
  'a deck/barge crane on the water',
  'a cutter-suction dredge on the water',
  'a CNC machining center on a factory floor',
  'a stamping press in a plant',
  'an industrial robot arm on a production line',
  'a mining haul truck at a pit',
  'a wheel loader at a quarry',
  'a mobile rock crusher plant',
  'a drill rig at a site',
  'a workover rig at an oil & gas site',
  'an industrial diesel generator / genset',
  'a towable air compressor unit',
  'an asphalt paver on a road job',
  'a cold milling machine on a highway',
  'a vibratory road roller on a road bed',
  'a motor grader on a haul road',
  'a backhoe loader on a site',
  'a skid steer loader on a site',
  'a telehandler on a site',
  'a box truck at a loading dock',
  'a Class 8 sleeper tractor in a yard',
];

// Random pick: a fresh machine each call. This is the default the pipeline
// uses so generic articles rotate freely across the full industrial range.
export function randomMachineHint() {
  const pool = VISUAL_PROMPT_MACHINE_HINTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Deterministic pick: same seed always maps to the same machine. Uses a small
// rolling string hash so a missing/empty seed falls back to the first entry
// rather than throwing.
export function machineHintFor(seed) {
  const pool = VISUAL_PROMPT_MACHINE_HINTS;
  const s = String(seed || '');
  if (!s) return pool[0];
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return pool[h % pool.length];
}
