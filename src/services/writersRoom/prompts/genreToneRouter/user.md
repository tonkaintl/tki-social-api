You are routing this story request to a panel of writers.

Context:
- story_seed: {{story_seed}}
- project_mode: {{project_mode}}
- target_brand: {{project.brand}}
- target_audience: {{project.audience}}

Creative sliders:
- fact_to_fiction (0-100): {{creative.fact_to_fiction}}
- creativity_to_reporter (0-100): {{creative.creativity_to_reporter}}
- tone_strictness (0-100): {{creative.tone_strictness}}
- length: {{creative.length}}

Research context:
- research_enabled: {{research.enable_research}}
- facts: {{research.facts}}

Guidance:
- When research_enabled is true OR facts is non-empty, you MUST give "documentary" a strong non-zero weight.
- For reference_doc, blog_post, or straight_ad modes, documentary should usually be one of the highest weights.

Decide which writer roles should be enabled and how strongly they should influence the piece.

Remember: respond ONLY with JSON in the exact schema described in the system message.