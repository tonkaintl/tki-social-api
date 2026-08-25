Generate ONE still-image prompt for the **{{intent}}** intent, based strictly
on the article below.

Anchor the prompt in the concrete subject, objects, and setting of THIS
article. Do not introduce concepts, settings, or objects that are not present
or implied in it. Do not fall back to a default industry.

MACHINE HINT — this is your DEFAULT subject. Use it unless a specific machine is
genuinely the article's SUBJECT (not just named once as an example):
{{machine_hint}}

METAPHOR COMPOSITION — only relevant when the intent is **metaphor**; blank
otherwise. When present, follow it instead of defaulting to a facing
side-by-side pair:
{{metaphor_composition}}

CURRENT PROMPT (this is what the user is replacing — depict a DIFFERENT machine
than this one unless the article's subject is a specific machine):
{{current_prompt}}

ADDITIONAL DIRECTION (optional, may be blank — overrides the machine hint):
{{instructions}}

TITLE:
{{final_draft.title}}

THESIS:
{{final_draft.thesis}}

SUMMARY:
{{final_draft.summary}}

ARTICLE:
{{final_draft.draft_markdown}}
