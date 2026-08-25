// ----------------------------------------------------------------------------
// Machine-hint rotation for visual prompts.
//
// Generic articles (about value, inspection, condition, the trade) never name
// a specific machine, so the Art Director kept defaulting to crawler
// excavators / dozers — which the image model (nano banana) also renders at the
// wrong scale. To break that bias we inject a concrete MACHINE HINT into the
// prompt context. The prompt uses it unless the article's SUBJECT is its own
// machine/industry.
//
// The pool is grouped BY INDUSTRY rather than kept flat, so the pick can be
// CONTEXT AWARE: we score the article text against each industry's signal
// words, then pick a random machine from the winning industry. That keeps the
// image on-topic for articles that lean an industry without naming a machine,
// while still rotating within that industry run to run.
//
// When nothing scores, we pick an industry at random FIRST and then a machine
// within it. Picking uniformly over a flat machine list would have quietly
// weighted the industries that happen to list more machines; industry-first
// keeps every industry equally likely.
//
// Measured bias this exists to correct (68 recent posts / 340 prompts): 62% of
// posts depicted a Class 8 semi tractor and 0% a farm tractor, against a ~6%
// share for trucking in a uniform pool. `trucking` therefore only wins on an
// explicit signal — it is never the random fallback (see FALLBACK_INDUSTRIES).
//
// Crawler excavators and dozers are intentionally excluded from the pool.
// ----------------------------------------------------------------------------

// Each industry lists the machines we are willing to name and the signal words
// that mark an article as belonging to it. Signals are matched case-insensitively
// on word boundaries against title + thesis + summary + draft.
export const MACHINE_HINT_INDUSTRIES = {
  aerialLifts: {
    machines: [
      'a rough-terrain scissor lift on a site',
      'a telescopic boom lift on a site',
      'an articulating boom lift on a site',
      'a vertical mast lift in a warehouse',
    ],
    signals: [
      'aerial lift',
      'boom lift',
      'scissor lift',
      'man lift',
      'manlift',
      'aerial work platform',
      'mewp',
      'fall protection',
      'working at height',
    ],
  },
  agriculture: {
    machines: [
      'a combine harvester in a field',
      'a farm tractor with an implement',
      'a self-propelled sprayer in a field',
      'a large round baler in a field',
      'a forage harvester in a field',
    ],
    signals: [
      'agricultur',
      'farm',
      'farming',
      'harvest',
      'crop',
      'acre',
      'tillage',
      'planting',
      'combine',
      'tractor',
      'livestock',
      'grain',
      'irrigation',
    ],
  },
  construction: {
    machines: [
      'a backhoe loader on a site',
      'a skid steer loader on a site',
      'a telehandler on a site',
      'a compact track loader on a site',
      'a ride-on trench compactor on a site',
      'a concrete boom pump at a pour',
    ],
    signals: [
      'construction',
      'job site',
      'jobsite',
      'contractor',
      'earthwork',
      'grading',
      'excavation',
      'foundation',
      'concrete',
      'demolition',
      'site prep',
      'backhoe',
      'skid steer',
      'telehandler',
    ],
  },
  cranes: {
    machines: [
      'an all-terrain mobile crane on a job site',
      'a rough-terrain crane on a job site',
      'a tower crane over a building site',
      'a carry-deck crane on a site',
    ],
    signals: [
      'crane',
      'lifting',
      'rigging',
      'hoist',
      'load chart',
      'outrigger',
      'boom',
      'counterweight',
      'lift plan',
    ],
  },
  forestry: {
    machines: [
      'a feller-buncher in a forestry cut',
      'a log loader at a timber landing',
      'a skidder on a logging site',
      'a forwarder on a logging trail',
      'a horizontal grinder at a wood yard',
    ],
    signals: [
      'forestry',
      'logging',
      'timber',
      'sawmill',
      'lumber',
      'harvester head',
      'skidder',
      'feller',
      'wood chip',
      'stumpage',
    ],
  },
  logistics: {
    machines: [
      'a forklift in a warehouse',
      'a reach stacker at a container yard',
      'an empty container handler at a terminal',
      'a narrow-aisle turret truck in a warehouse',
      'a rough-terrain forklift at a lumber yard',
    ],
    signals: [
      'warehouse',
      'logistics',
      'distribution center',
      'forklift',
      'pallet',
      'container',
      'freight terminal',
      'material handling',
      // NB: "inventory" is deliberately NOT a signal — every equipment dealer
      // has inventory, so it dragged generic trade articles into logistics.
      'loading dock',
      'supply chain',
      'intermodal',
    ],
  },
  manufacturing: {
    machines: [
      'a CNC machining center on a factory floor',
      'a stamping press in a plant',
      'an industrial robot arm on a production line',
      'a plastic injection molding machine in a plant',
      'a fiber laser cutting machine on a shop floor',
      'a press brake on a fabrication floor',
    ],
    signals: [
      'manufactur',
      'factory',
      'plant floor',
      'production line',
      'machine shop',
      'cnc',
      'fabrication',
      'tooling',
      'stamping',
      'robotics',
      'automation',
      'assembly line',
      'machining',
    ],
  },
  marine: {
    machines: [
      'a harbor tug at a dock',
      'a deck/barge crane on the water',
      'a cutter-suction dredge on the water',
      'a ship-to-shore gantry crane at a port',
      'a push boat on a river',
    ],
    signals: [
      'marine',
      'vessel',
      'barge',
      'tugboat',
      'harbor',
      'shipyard',
      'dredg',
      'waterway',
      'port of',
      'maritime',
      'dockside',
      'hull',
    ],
  },
  mining: {
    machines: [
      'a mining haul truck at a pit',
      'a wheel loader at a quarry',
      'a mobile rock crusher plant',
      'a tracked screening plant at a quarry',
      'a blasthole drill rig at a pit',
    ],
    signals: [
      'mining',
      'quarry',
      'aggregate',
      'crusher',
      'pit',
      'overburden',
      'haul road',
      'ore',
      'gravel',
      'screening plant',
    ],
  },
  oilGasPower: {
    machines: [
      'a workover rig at an oil & gas site',
      'an industrial diesel generator / genset',
      'a towable air compressor unit',
      'a hydraulic fracturing pump unit at a well site',
      'a substation transformer at a power yard',
    ],
    signals: [
      'oil',
      'gas field',
      'oilfield',
      'drilling',
      'well site',
      'wellsite',
      'pipeline',
      'refinery',
      'generator',
      'genset',
      'power plant',
      'substation',
      'compressor',
      'energy sector',
    ],
  },
  roadBridge: {
    machines: [
      'an asphalt paver on a road job',
      'a cold milling machine on a highway',
      'a vibratory road roller on a road bed',
      'a motor grader on a haul road',
      'a bridge inspection unit on a span',
    ],
    signals: [
      'paving',
      'asphalt',
      'highway',
      'roadway',
      'road construction',
      'bridge',
      'milling',
      'dot project',
      'work zone',
      'resurfacing',
      'infrastructure',
    ],
  },
  trucking: {
    machines: [
      'a Class 8 sleeper tractor in a yard',
      'a Class 8 day cab tractor in a yard',
      'a box truck at a loading dock',
      'a heavy-duty tow truck in a yard',
      'a refuse packer truck on a route',
    ],
    signals: [
      'class 8',
      'semi truck',
      'semi-truck',
      'sleeper',
      'day cab',
      'freightliner',
      'peterbilt',
      'kenworth',
      'over-the-road',
      'otr',
      'trucking',
      'fleet truck',
      'box truck',
      'dot inspection',
      'cdl',
    ],
  },
};

export const MACHINE_HINT_INDUSTRY_KEYS = Object.keys(MACHINE_HINT_INDUSTRIES);

// Industries eligible for the no-signal random fallback. `trucking` is excluded
// on purpose: Class 8 tractors already dominate the generated set (62% of recent
// posts), so a truck should only ever appear when the article actually asks for
// one.
const FALLBACK_INDUSTRIES = MACHINE_HINT_INDUSTRY_KEYS.filter(
  key => key !== 'trucking'
);

// Flat list kept as a named export for callers/tests that just want the full
// vocabulary. Derived so the grouped map stays the single source of truth.
export const VISUAL_PROMPT_MACHINE_HINTS = MACHINE_HINT_INDUSTRY_KEYS.flatMap(
  key => MACHINE_HINT_INDUSTRIES[key].machines
);

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Count signal hits for each industry. Multi-word signals are matched as
// substrings; single words are matched on word boundaries so "pit" doesn't
// fire on "capital" and "otr" doesn't fire on "control".
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countSignal(haystack, signal) {
  const escaped = escapeRegExp(signal);
  const pattern = signal.includes(' ')
    ? new RegExp(escaped, 'g')
    : new RegExp(`\\b${escaped}`, 'g');
  return (haystack.match(pattern) || []).length;
}

// A signal in the title/thesis/summary says what the article IS ABOUT. The same
// word buried in the body may only be an illustrative anecdote, so it counts for
// much less. This is the difference between "Buying a Used Class 8?" (subject)
// and "a low-priced listing for a 2013 Freightliner appears…" (example).
const HEADLINE_WEIGHT = 3;

// Trucking is the runaway over-produced subject (62% of recent posts vs a ~6%
// uniform share), and almost every trade article name-drops a Freightliner or a
// Class 8 somewhere. So trucking does not win on a stray mention: it must clear
// a real floor AND out-score every other industry outright.
//
// Tuned against the 68-post corpus, scoring each article and comparing against
// whether its TITLE is actually about trucks:
//   threshold  4 → 9 truck articles hinted, 4 generic articles wrongly trucked
//   threshold  6 → 9 hinted, 3 wrongly trucked
//   threshold  8 → 8 hinted, 2 wrongly trucked   ← chosen
//   threshold 12 → 3 hinted, 0 wrongly trucked
// The asymmetry drives the choice: under-hinting a genuine truck article is
// cheap (the prompt's step-1 subject rule still picks the truck up, because such
// an article names it in the title), while over-hinting a generic trade article
// is precisely the reported bug. So we sit high. For reference the article that
// prompted this fix ("Navigating Online Heavy Equipment Sales", a generic due-
// diligence piece that merely opens on a Freightliner anecdote) scores 5.
const TRUCKING_MIN_SCORE = 8;

// Accept either a plain blob or { body, headline } so callers can mark which
// part of the article is the headline material.
function splitArticle(article) {
  if (article && typeof article === 'object') {
    return {
      body: String(article.body || '').toLowerCase(),
      headline: String(article.headline || '').toLowerCase(),
    };
  }
  return { body: String(article || '').toLowerCase(), headline: '' };
}

/**
 * Score every industry against the article.
 * Returns an array of { industry, score } sorted high → low, zero-scores dropped.
 *
 * @param {string|{body?: string, headline?: string}} article
 */
export function scoreIndustries(article) {
  const { body, headline } = splitArticle(article);
  if (!body && !headline) return [];

  return MACHINE_HINT_INDUSTRY_KEYS.map(industry => ({
    industry,
    score: MACHINE_HINT_INDUSTRIES[industry].signals.reduce(
      (total, signal) =>
        total +
        countSignal(body, signal) +
        countSignal(headline, signal) * HEADLINE_WEIGHT,
      0
    ),
  }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Context-aware hint pick.
 *
 * Scores the article text, keeps every industry within the top tier (ties are
 * common on short drafts), then picks one of those industries at random and a
 * random machine inside it. With no usable signal it falls back to a random
 * non-trucking industry.
 *
 * @param {string|{body?: string, headline?: string}} article  Article text.
 *   Pass { body, headline } to weight title/thesis/summary as subject material.
 * @param {object} [options]
 * @param {string[]} [options.excludeIndustries]  Industries to skip — used by the
 *   regenerate route so a re-roll lands on something new.
 * @returns {string} A concrete machine phrase.
 */
export function contextualMachineHint(article, options = {}) {
  const excluded = new Set(options.excludeIndustries || []);

  const scored = scoreIndustries(article)
    .filter(entry => !excluded.has(entry.industry))
    .filter((entry, index) => {
      if (entry.industry !== 'trucking') return true;
      // Trucking only survives as an outright, well-evidenced winner.
      return index === 0 && entry.score >= TRUCKING_MIN_SCORE;
    });

  let candidates;
  if (scored.length > 0) {
    const topScore = scored[0].score;
    candidates = scored
      .filter(entry => entry.score === topScore)
      .map(entry => entry.industry);
  } else {
    candidates = FALLBACK_INDUSTRIES.filter(key => !excluded.has(key));
    // Every fallback industry was excluded — ignore the exclusions rather than
    // return nothing.
    if (candidates.length === 0) candidates = FALLBACK_INDUSTRIES;
  }

  return pickRandom(MACHINE_HINT_INDUSTRIES[pickRandom(candidates)].machines);
}

/**
 * Which industry does an already-written prompt depict? Used by the regenerate
 * route to rotate AWAY from whatever is currently on screen.
 *
 * @param {string} promptText
 * @returns {string|null} Industry key, or null when nothing matches.
 */
export function industryOfPrompt(promptText) {
  const haystack = String(promptText || '').toLowerCase();
  if (!haystack) return null;

  // Trucking wins on any signal here, ahead of the generic scoring below. Its
  // signals are highly specific (class 8, sleeper, day cab, Freightliner), while
  // a truck prompt's SETTING routinely name-drops another industry's words
  // ("parked among trailers at a loading dock" scores logistics). Without this,
  // a re-roll excludes logistics, leaves trucking eligible, and hands back
  // another semi — the exact thing the caller is trying to rotate away from.
  if (
    MACHINE_HINT_INDUSTRIES.trucking.signals.some(
      signal => countSignal(haystack, signal) > 0
    )
  ) {
    return 'trucking';
  }

  // Match against the machine phrases first — a written prompt names its machine
  // far more reliably than it hits topical signal words.
  for (const industry of MACHINE_HINT_INDUSTRY_KEYS) {
    for (const machine of MACHINE_HINT_INDUSTRIES[industry].machines) {
      // Compare on the distinctive noun of each phrase (drop leading articles
      // and trailing location clauses).
      const noun = machine
        .replace(/^an? /, '')
        .replace(/^the /, '')
        .split(/ (?:in|at|on|over|with) /)[0]
        .toLowerCase();
      if (haystack.includes(noun)) return industry;
    }
  }

  const scored = scoreIndustries(haystack);
  return scored.length > 0 ? scored[0].industry : null;
}

// Random pick across the whole (non-trucking-biased) vocabulary. Retained for
// callers that have no article context to work from.
export function randomMachineHint() {
  return contextualMachineHint('');
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
