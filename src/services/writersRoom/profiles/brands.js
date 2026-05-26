// ----------------------------------------------------------------------------
// Brand registry — port of the BRAND_CONFIGS lookup table from the n8n
// "Switch Target Brand" code node.
//
// Each entry defines the voice/guidelines used to shape the Head Writer's
// system message. Keys must match values in PLATFORM_BRANDS in
// constants/writersroom.js.
// ----------------------------------------------------------------------------

export const BRAND_CONFIGS = {
  diesel_kings: {
    project: {
      guidelines: {
        do: [
          'Be direct about condition and risk',
          'Emphasize steel, work, and real margins',
          'Use simple, concrete language',
        ],
        dont: [
          'No Instagram fantasy or lifestyle fluff',
          "No vague superlatives like 'premium' or 'best in class'",
        ],
        style_examples: [
          'We sell steel, not stories.',
          'The right call for every deal.',
        ],
      },
      name: 'Diesel Kings',
      slug: 'diesel_kings',
      tagline: 'We sell steel, not stories.',
      voice: 'Plainspoken, blue-collar smart, no hype',
    },
  },

  echoloop: {
    project: {
      guidelines: {
        do: [
          'Lean into atmosphere and texture',
          'Keep copy minimal, almost haiku-like',
          'Suggest a mood instead of explaining it',
        ],
        dont: [
          'No corporate buzzwords',
          'No detailed tech specs in the main hook',
        ],
        style_examples: [
          'Neon hum, diesel heart.',
          'Soundtracks for the in-between hours.',
        ],
      },
      name: 'EchoLoop',
      slug: 'echoloop',
      tagline: 'Loops for late-night brains.',
      voice: 'Moody, hypnotic, slightly cyberpunk',
    },
  },

  generic_brand: {
    project: {
      guidelines: {
        do: [
          'Be clear and concrete',
          'Explain only what’s needed',
          'Avoid slang unless explicitly requested',
        ],
        dont: [
          'No hard-sell hype',
          'No niche references requiring extra context',
        ],
        style_examples: ['Straight facts, clean language.'],
      },
      name: 'Generic Brand',
      slug: 'generic_brand',
      tagline: '',
      voice: 'Neutral, clear, and informative',
    },
  },

  ketosis_lifestyle_project: {
    project: {
      guidelines: {
        do: [
          'Connect practical tips to lived experience',
          'Balance science with story and mindset',
          'Use clear, non-guru language',
        ],
        dont: [
          'No miracle claims or diet cult vibes',
          'No shaming, no body panic language',
        ],
        style_examples: [
          'This isn’t a diet. It’s a quieter way to eat.',
          'Less noise, fewer carbs, more signal.',
        ],
      },
      name: 'Ketosis Lifestyle Project',
      slug: 'ketosis_lifestyle_project',
      tagline: 'Modern foraging, deep ketosis, real life.',
      voice: 'Calm, grounded, reflective, science-aware but human first',
    },
  },

  purple_star: {
    project: {
      guidelines: {
        do: [
          'Keep it fun and story-driven',
          'Use simple, visual language that feels like gameplay',
          'Highlight choices, consequences, and discovery',
        ],
        dont: [
          'No heavy jargon about dev stacks',
          'No adult cynicism or bleakness',
        ],
        style_examples: [
          'The map loads, the world glitches, and the real quest begins.',
          'You don’t just play Purple Star—you fall into it.',
        ],
      },
      name: 'Purple Star',
      slug: 'purple_star',
      tagline: 'Stories from inside the game.',
      voice: 'Curious, adventurous, kid-smart but not babyish',
    },
  },

  theater_404: {
    project: {
      guidelines: {
        do: [
          'Lean into meta commentary about media and algorithms',
          'Mix dry humor with genuine curiosity',
          'Treat the audience like co-conspirators, not followers',
        ],
        dont: [
          'No mean-spirited dunking on real people',
          'No inside baseball that requires deep tech knowledge to enjoy',
        ],
        style_examples: [
          'Tonight’s feature: one part sci-fi, two parts “how did this get rendered?”',
          'We watch the bots so you don’t have to.',
        ],
      },
      name: 'Theater 404',
      slug: 'theater_404',
      tagline: 'The show where the algorithm is the villain.',
      voice: 'Wry, meta, MST3K-adjacent, self-aware',
    },
  },

  tonka_blog: {
    project: {
      guidelines: {
        do: [
          'Explain how the business actually works',
          'Use real scenarios, deals, and shop-floor logic',
          'Emphasize trust, transparency, and long-term thinking',
        ],
        dont: [
          'No generic “content marketing” tone',
          'No pretending every deal is perfect',
        ],
        style_examples: [
          'We don’t sell the dream. We explain the work.',
          'Every truck has a story. We care about the ones that start after you pay for it.',
        ],
      },
      name: 'Tonka Blog',
      slug: 'tonka_blog',
      tagline: 'Dispatches from the iron business.',
      voice: 'Straight-talking broker, reflective but practical',
    },
  },

  tonka_newsletter: {
    project: {
      guidelines: {
        do: [
          'Keep it short and skimmable',
          'Highlight what actually matters this week',
          'Blend inventory, market notes, and practical tips',
        ],
        dont: [
          'No long essays in the main body',
          'No fluffy “community” filler with zero value',
        ],
        style_examples: [
          'Three deals worth knowing about, one lesson we paid for.',
          'If it doesn’t help you buy or sell, it doesn’t go in.',
        ],
      },
      name: 'Tonka Newsletter',
      slug: 'tonka_newsletter',
      tagline: 'A quick read for people who move heavy things.',
      voice: 'Concise, useful, broker-to-broker conversational',
    },
  },
};

export function getBrandConfig(brandKey) {
  return BRAND_CONFIGS[brandKey] || BRAND_CONFIGS.generic_brand;
}
