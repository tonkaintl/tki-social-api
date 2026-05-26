Context:
- Story seed: {{story_seed}}
- Project mode: {{project_mode}}
- Brand: {{project.brand}}
- Audience: {{project.audience}}
- Research enabled: {{research.enable_research}}
- Facts (if any): {{research.facts}}
- Your action weight: {{writers.action.weight}}

Task:
1. Generate intense, action-oriented story beats tailored to the story seed, project mode, brand, and audience.
2. Emphasize:
   - Risk, danger, or high stakes.
   - Characters making decisive moves under pressure.
   - Moments where things could go very wrong or narrowly succeed.
3. If facts or real-world stakes are provided, weave them into the beats as concrete dangers or pressures (e.g., financial loss, equipment failure, safety issues), but keep each beat short and dynamic.
4. Do NOT write full scenes, exposition, or dialogue — only sharp, compact action beats.

Return ONLY valid JSON:

{
  "role": "action",
  "notes": [
    "...",
    "..."
  ],
  "weight": {{writers.action.weight}}
}