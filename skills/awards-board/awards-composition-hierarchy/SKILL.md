---
name: awards-composition-hierarchy
description: "Propose three structurally different original board layouts from the same approved facts and assets. Use for arrangement and reading order, not as a substitute for evidence, font verification or renderer fit checks."
metadata:
  pack-version: "1.0"
---

# Composition and hierarchy

## Inputs

Read the [shared contract](../shared/CONTRACT.md). Use a frozen approved fact snapshot, copy options, permitted asset IDs, brand constraints, canvas size/aspect ratio, output medium and intended viewing context. If the target is unknown, state a provisional canvas and request confirmation before final export claims.

## Reasoning

- Identify the primary explanation and the order in which a reader needs information. Offer intuitive original preset families, including 50/50 image/text, hero with evidence rail, panorama with story, three-step sequence, documented comparison, modular grid, system map, evidence-led case, typographic idea, annotated detail, audience encounter and editorial story with inset proof. Recommend three suited to the task, not all 12. No medal-based template claims.
- Use original structural families: decisive hero, process sequence, meaningful comparison, system relationships, evidence-led argument or typographic statement. They are flexible reasoning tools, not copies or mandatory templates.
- Offer exactly three directions with different information architecture, focal point and reading path. Changing colour or typeface alone is not a new direction. Keep the same approved facts and qualifiers; disclose any proposed omission, repetition or emphasis change.
- Choose structures according to the mechanism. A sequence suits an unfolding action; a system diagram suits interacting parts; a hero suits an immediately demonstrable intervention. Do not force weak evidence into a results-dominated layout.
- Balance explanatory headline, execution and proof. Group related claims and sources; use whitespace to separate roles. Preserve a route into detail without giving every element equal weight.
- Specify relationships and constraints rather than guessed final pixels: alignments, relative emphasis, reading order, grouping, safe areas, minimum legibility requirements supplied by the target and responsive reflow priorities.
- Recompose for portrait, square and landscape. Do not merely scale a landscape board into a phone image. Define which groups move together and which annotations remain attached.

- Reserve an intentional placement for the approved brand-specific logo, respecting authentic geometry, supplied clearspace/minimum-size rules, contrast and approved variant. Coordinate with the brand/logo skill: logo source quality and effective resolution must pass at actual placement and after export. Missing or unresolved logo quality permits a draft, never a final-quality claim. Preserve user placement adjustments; surface conflicts rather than silently moving them.

## Output and UI

Return three `layout_directions`, each with structure, focal point, reading order, element/fact bindings, target canvas, constraint intent, format adaptations, rationale and tradeoffs. Recommend one provisionally. Mark fit and legibility Not checked until rendered.

The UI offers three comparable previews from one fact version and a “Why this direction” explanation. Choosing a direction creates a new project version. The renderer, not the model's prose, resolves coordinates and applies constraints.

## Quality checks

Can each direction be recognised in a monochrome wireframe? Are all required facts/labels present without invention? Are they appropriate to the campaign rather than a house style? After rendering, inspect clipping, overlap, actual font metrics and reading order. If constraints fail, revise hierarchy or content with approval; never certify a layout from JSON alone.
