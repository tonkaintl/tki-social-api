Generate ONE still-image prompt for the **{{intent}}** intent, based strictly
on the article below.

Anchor the prompt in the concrete subject, objects, and setting of THIS
article. Do not introduce concepts, settings, or objects that are not present
or implied in it. Do not fall back to a default industry.

MACHINE HINT (use ONLY if the article doesn't name its own machine/industry):
{{machine_hint}}

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
