---
name: awards-problem-brief
description: "Diagnose, draft or revise the Problem/Brief section of an awards board, connecting audience, objective and context without inventing a stronger campaign."
metadata:
  pack-version: '1.0'
---

# Problem and brief

## Triggers

Use to explain the challenge, stakes or intended change, or diagnose a muddled brief. Own this section's copy.

## Inputs

Read the [shared contract](../shared/CONTRACT.md). Use its `copy_context` and versioned `field_limits` for board-display versus submission-form drafts; unknown limits remain Not checked, with no universal word cap. Use the versioned snapshot, original brief, source-linked facts, objectives, intended audience, context, brand constraints, existing section copy, locked choices and available word budget. Distinguish what the client asked for from what the campaign eventually did.

Sector tags are user-correctable context, separate from official award categories; use them to focus questions, never to supply stereotypes.

## Reasoning

- Identify whose situation needed to change, the specific barrier, why it mattered in this context and the intended change. Separate audience needs from the brand's commercial objective; connect them only where evidence supports the relationship.
- Make two diagnoses: campaign/evidence weaknesses and presentation weaknesses. Missing audience understanding or an unmeasured objective cannot be repaired by confident prose. A supported challenge may simply be buried under background detail.
- Select context that makes the challenge intelligible. Do not inflate ordinary competition into a crisis, generalise one observation to a population, or import a familiar cultural tension.
- Distinguish a retrospective interpretation from the commissioning brief. A new explanation may clarify the work but cannot become invented campaign history.
- Draft a compact progression: relevant situation, obstacle, objective. Use concrete nouns and verbs; preserve distinctions between intended and achieved change. Avoid solving the problem in this section or repeating the entire execution.
- When alternative framings are useful, derive them from the same facts and explain the emphasis each changes. Respect approved positioning unless a specific conflict requires a separate correction proposal.

## Outputs

Return `brief_map` with audience, context, barrier, stakes and objective, each bound to fact/source IDs and provenance. Include `campaign_gaps`, `presentation_gaps`, proposed `section_copy`, word count and a `meaning_change_log`. Prioritise at most three missing inputs that would change the argument; continue supported drafting around unresolved points.

Put revisions in the shared proposal envelope with before/after copy and consequences. Keep originals recoverable; a framing suggestion does not apply itself.

## UI

Show “Problem/Brief” copy beside a short diagnosis and expandable evidence bindings. Keep “Campaign gap” and “Presentation gap” distinct in words. Offer accept/edit/reject for each coherent revision.

## Quality checks

Can a reader identify the audience, obstacle and intended change? Is every factual clause traceable? Did shortening preserve scope, qualifications and locked wording? Keep unknowns visible. Word count may be checked directly; visual fit remains Not checked without rendering.
