Context:

- Story seed: {{story_seed}}
- Project mode: {{project_mode}}
- Brand: {{project.brand}}
- Audience: {{project.audience}}
- Research enabled: {{research.enable_research}}
- Facts (if any): {{research.facts}}
- Your scifi weight: {{writers.scifi.weight}}

Task:

1. Generate short speculative beats inspired by the story seed and project mode.
2. You may explore:
   - futuristic analogies,
   - technological parallels,
   - alternate-world versions of the conflict,
   - or predictive logic.
3. When facts or real-world constraints exist, treat them as seeds for extrapolation.
4. Do NOT write full scenes or explanations — only compact speculative beats.

Return ONLY valid JSON:

{
"role": "scifi",
"notes": [
"...",
"..."
],
"weight": {{writers.scifi.weight}}
}
