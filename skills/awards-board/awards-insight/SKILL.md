---
name: awards-insight
description: "Find, draft or revise the Insight section of an awards board by separating supported human tensions from observations, statistics and proposed interpretations."
metadata:
  pack-version: '1.0'
---

# Insight

## Triggers

Use to develop audience insight, interrogate a statistic presented as insight, or sharpen insight copy. Never invent its discovery process.

## Inputs

Read the [shared contract](../shared/CONTRACT.md). Use its `copy_context` and versioned `field_limits` for board-display versus submission-form drafts; unknown limits remain Not checked, with no universal word cap. Use the versioned snapshot, audience/context facts, research extracts and methods, supplied quotations, known campaign rationale, approved Problem/Brief, existing copy and brand voice. Never invent missing interviews or observations.

Sector tags are user-correctable context, separate from official award categories; use them to focus questions, never to supply stereotypes.

## Reasoning

- Separate observation, interpretation and strategic implication. A statistic describes a measurement or claim; an insight explains human tension, motivation or barriers. A plausible explanation is still an inference.
- Identify the relationship that matters: what people want, what they do and what makes those diverge. Not every campaign has this pattern; retain a simpler supported observation when deeper psychology would be speculative.
- Test whether the proposed insight explains this audience and context, could be contradicted by evidence and gives the actual idea a meaningful role. Avoid universal claims about human nature that could justify any campaign.
- Keep audience scope and research limits attached. A quotation from one participant cannot establish a population's belief; a correlation cannot establish motive. Use an exact quotation only with supplied wording and permission.
- Distinguish what the team demonstrably knew at the time from a useful retrospective reading. Offer the latter as “Interpretation”, without claiming it inspired the campaign or was discovered through research.
- Draft the supported observation and human significance in plain language. Offer distinct readings from the same facts, with dependencies and disconfirming evidence. Recommend provisionally rather than manufacturing certainty.

## Outputs

Return `insight_chain` containing observation, proposed interpretation, strategic implication, dependencies and provenance; include `section_copy`, word count, alternatives where useful and unresolved evidence questions. Bind factual clauses to fact/source IDs and interpretation to its supporting facts and reasoning.

For revisions, provide targeted before/after proposals, a `meaning_change_log` and any shifted audience or certainty. Preserve the prior draft and accepted interpretation; changes use the shared reversible proposal envelope.

## UI

Present the draft with “Observation” and “Interpretation” labels and expandable source context. Acceptance never removes the Interpretation label. Let the user accept/edit/reject an interpretation separately from its wording.

## Quality checks

Does the insight explain something beyond repeating a number? Is the connection to the actual idea defensible? Check for invented motives, research history, universality or causal language. Ensure concise wording preserves uncertainty. Treat line breaks and visual fit as Not checked without a render.
