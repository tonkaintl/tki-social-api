Context:

- Story seed: {{story_seed}}
- Project mode: {{project_mode}}
- Brand: {{project.brand}}
- Audience: {{project.audience}}
- Research enabled: {{research.enable_research}}
- Facts (if any): {{research.facts}}
- Your comedy weight: {{writers.comedy.weight}}

Task:

1. Generate short comedic beats tailored to the story seed, project mode, brand, and audience.
2. Use irony, contrast, understatement, or light absurdity. No slapstick unless context strongly suggests it.
3. If facts or real stakes exist, you may:
   - exaggerate them humorously,
   - highlight contradictions,
   - or create witty comparisons.
4. Do NOT write full scenes or dialogue — only compact comedic beats.

Return ONLY valid JSON:

{
"role": "comedy",
"notes": [
"...",
"..."
],
"weight": {{writers.comedy.weight}}
}
