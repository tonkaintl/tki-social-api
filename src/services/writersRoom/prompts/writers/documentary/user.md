Context:
- Story seed: {{story_seed}}
- Project mode: {{project_mode}}
- Brand: {{project.brand}}
- Audience: {{project.audience}}
- Research enabled: {{research.enable_research}}
- Facts (if any): {{research.facts}}
- Your documentary weight: {{writers.documentary.weight}}

Task:
1. Generate concise documentary-style insights reflecting the factual, real-world dimension of the story seed.
2. Emphasize:
   - context,
   - risk factors,
   - real-world forces or constraints,
   - data,
   - practical cause–effect relationships.
3. If research facts exist, integrate them directly as documentary observations.
4. Do NOT write scenes, drama, opinions, or creative commentary — only observational documentary notes.

Return ONLY valid JSON:

{
  "role": "documentary",
  "notes": [
    "...",
    "..."
  ],
  "weight": {{writers.documentary.weight}}
}