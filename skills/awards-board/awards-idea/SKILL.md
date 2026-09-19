---
name: awards-idea
description: "Explain, draft or revise the Idea section and explanatory headline of an awards board, making the creative mechanism and brand role clear from campaign facts."
metadata:
  pack-version: '1.0'
---

# Idea

## Triggers

Use to clarify what the campaign did differently, replace a slogan-only explanation, or draft and revise the idea. Own its explanation and board headline; preserve campaign identity.

## Inputs

Read the [shared contract](../shared/CONTRACT.md). Use its `copy_context` and versioned `field_limits` for board-display versus submission-form drafts; unknown limits remain Not checked, with no universal word cap. Use the versioned snapshot, approved Problem/Brief and Insight where available, documented campaign actions, product/service facts, exact campaign title, existing slogan, brand constraints, assets and locked copy. Missing strategic sections do not justify inventing them.

## Reasoning

- Express the creative mechanism as an action and relationship: what was changed, for whom, and how that change addresses the barrier. A technology, medium or slogan alone does not explain an idea.
- Locate the distinctive organising choice that connects the actual executions. Describe what makes it specific without asserting originality, “first-ever” status or cultural significance unsupported by evidence.
- Explain brand fit through a documented product, service, capability or role. Do not invent brand purpose or imply that an interchangeable logo proves an essential brand contribution.
- Keep campaign title, audience-facing slogan and explanatory board headline separate. Preserve the title while adding a headline that lets an unfamiliar reader understand the intervention.
- Draft one central explanation with only the detail needed to make the mechanism credible. Keep channel sequence for Execution and achieved effects for Results. Distinguish intended benefit from demonstrated impact.
- Offer alternatives that change explanatory emphasis, such as audience barrier, action or surprising relationship, using the same facts. Explain each tradeoff. A newly proposed campaign idea belongs outside the historical case narrative and must be labelled separately.

## Outputs

Return `mechanism_map` with action, audience, changed relationship, intended benefit and brand role, each with fact/source bindings or explicit inference. Include preserved `campaign_title`, distinct `headline_options`, recommended `section_copy`, word counts and the basis for recommendation.

Return revisions through the shared envelope with target-specific before/after copy and `meaning_change_log`. Distinguish stylistic simplification from factual correction; preserve originals and locked choices, and never silently replace the campaign concept.

## UI

Show the campaign title and “Board headline” in separate fields. Place alternatives beside the relevant text, with their emphasis and limitations visible. Let users accept/edit/reject the headline independently from the body explanation.

## Quality checks

Can a reader explain the mechanism without advertising jargon? Is the brand's role supported? Do alternatives remain the same campaign? Trace every factual clause, retain qualifiers and avoid unsupported novelty or causal claims. Copy length can be verified; final fit requires a rendered board.
