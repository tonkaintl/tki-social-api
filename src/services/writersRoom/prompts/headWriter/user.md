Story seed:
{{story_seed}}

Writer panel (roles + weights):
{{writer_panel_json}}

Writer notes (merged brainstorms by role):
{{writer_notes_json}}

Brand profile:
- Name: {{target_brand.project.name}}
- Audience: {{project.audience}}

Brand voice:
- Core voice: {{target_brand.project.voice}}
- Do:
{{brand_do_list}}
- Don’t:
{{brand_dont_list}}
- Reference lines:
{{brand_style_examples}}

Creative sliders:
- fact_to_fiction: {{creative.fact_to_fiction}}
- creativity_to_reporter: {{creative.creativity_to_reporter}}
- tone_strictness: {{creative.tone_strictness}}
- length: {{creative.length}}

Project mode profile (for your internal use):
{{project_mode_profile_json}}

Research context:
- enable_research: {{research.enable_research}}
- user_facts: {{research.facts}}

Research findings:
{{research_findings_text}}

Research requirements (non-negotiable when enable_research is true):
1. If there are 1–3 findings, you MUST use every finding at least once in the story and/or practical explanation.
2. If there are more than 3 findings, you MUST use at least 3 distinct findings as concrete details. You may use more if it feels natural.
3. When you describe inspections, condition, safety, maintenance, or value, you MUST base those details on the findings above. You may paraphrase or compress, but do not contradict them or invent incompatible technical details.
4. You may express findings inside the allegorical story, in the real-world explanation, or both, but they cannot be ignored while enable_research is true.

Task:
1. Use writer_notes and writer_panel as your internal outline and weighting guide.
2. Follow the brand guidelines and project_mode_profile above.
3. Use the research findings to ground any technical or practical details, respecting all research requirements.
4. Produce a single JSON object with the following fields:
   - "role": always "head_writer".
   - "title": a short, optional title or headline (use "" if none).
   - "thesis": one-sentence core idea or lesson.
   - "draft_text": the full draft as plain text ONLY (no Markdown, no headings like ###, no bold markers like **, no code fences). Use normal paragraphs and simple lists like:
       - item one
       - item two
     If you need section breaks, use a plain text line divider like: "-----"
   - "summary": a 2–3 sentence prose recap of the main point.