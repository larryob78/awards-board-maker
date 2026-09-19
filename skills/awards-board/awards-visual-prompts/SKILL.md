---
name: awards-visual-prompts
description: "Write original art direction and generation prompts for proposed awards-board visuals from client facts and permitted assets. Use for prompt craft and concept alternatives; invocation does not authorise image generation."
metadata:
  pack-version: '1.0'
---

# Visual prompts

Read the [shared contract](../shared/CONTRACT.md). Accept a visual job, source-linked facts, asset permissions, shared brand constraints and canvas. Use [visual storytelling](../awards-visual-storytelling/SKILL.md) when the unresolved problem is which visuals explain the board. This skill writes proposals; it does not access credentials, transmit assets or make generation calls.

## Translate the idea into a picture

Separate factual constraints from creative choices. Identify the action or relationship the viewer must notice first, then the detail that explains why it matters. Describe concrete subject, setting, action, scale and placement. Choose composition, light, materials, colour and viewpoint to support that reading. Specify lens or depth of field only when it changes the intended relationship; avoid contradictory camera terms and decorative technical lists.

Build original direction from client facts. Do not reproduce an uncleared reference's distinctive composition. A supplied asset may inform a prompt only within its documented processing permissions. Keep unverified surfaces, people, locations and product features conditional. A photorealistic treatment remains an AI concept; never present generated imagery as campaign documentation or evidence of outcomes.

Offer a small set of meaningfully different alternatives, each with a visual premise, focal point, composition and tradeoff. Make differences about the story, such as human interaction versus an explanatory object detail, rather than synonym swaps. Match the requested canvas, crop tolerance and board role; protect usable negative space for copy without asking the image model to typeset unsupported factual claims.

Reserve an explicit region for the app to overlay the authentic approved logo, using shared brand placement, clear-space and contrast constraints. Identify the official asset and overlay as a separate operation. Never ask a generator to create, approximate or alter official logos; missing assets remain unresolved.

## Adapt only to verified capabilities

Use provider-specific syntax or parameters only when supported by a supplied, traceable capability record or authorised verification for the selected model/version. Distinguish prompt prose from actual parameters. Unknown reference support, dimensions, masks, seeds or negative-prompt support stays unknown. Without verified capabilities, deliver a provider-neutral brief and unresolved adaptation checklist, not invented settings.

Return the contract envelope with `art_direction_alternatives`, `prompt_proposals`, `source_bound_facts`, `creative_choices`, `logo_overlay_region`, `required_labels`, `capability_bindings` and `render_checks`. Specify exclusions as prose unless structured negative prompts are verified. Bind each factual detail and asset constraint to its source. Require exported concept labels and checks for invented features, misleading realism, composition, copy space, authentic-logo placement and board legibility. Until generation and rendering are separately authorised and performed, report their checks as Not checked.
