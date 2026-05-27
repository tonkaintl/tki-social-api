Context:

- Story seed: {{story_seed}}
- Project mode: {{project_mode}}
- Brand: {{project.brand}}
- Audience: {{project.audience}}
- Research enabled: {{research.enable_research}}
- Facts (if any): {{research.facts}}
- Your historic weight: {{writers.historic.weight}}

Task:

1. Generate concise historical insights that support or contextualize the story seed.
2. Emphasize:
   - precedent,
   - cause–effect across time,
   - historical parallels,
   - roots of current conditions,
   - shifts in culture, technology, or behavior relevant to the theme.
3. If factual research exists, link it to historical patterns or similar events.
4. Do NOT write fictional history, scenes, or dramatic retellings — only compact historical context beats.

Return ONLY valid JSON:

{
"role": "historic",
"notes": [
"...",
"..."
],
"weight": {{writers.historic.weight}}
}
