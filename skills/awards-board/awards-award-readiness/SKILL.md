---
name: awards-award-readiness
description: Check sourced requirements and copy limits for a selected festival, year and category, separating board text from submission forms. Use for submission readiness across festivals, not quality certification or guessed eligibility.
metadata:
  pack-version: "1.0"
---

# Award readiness

## Inputs

Read the [shared contract](../shared/CONTRACT.md). Require festival, year, programme/category/subcategory, submission material type and dated authoritative rule records. Use one approved evidence record and separate copy/export variants. The [limited 2026 examples](../shared/FESTIVAL-ADAPTERS.md) illustrate five expandable adapters, not a complete rule database.

## Reasoning

- Support Cannes Lions, D&AD, The One Show, Clios and New York Festivals through versioned adapters. Missing fields, future seasons, unsupported programmes or unverified requirements remain Not checked. Never copy last year's numbers into an unknown year.
- A case board is not automatically Design Lions. User sector tags are not official category IDs. Confirm the actual entry target; map industries to official verticals only from verified guidance.
- Distinguish hard per-field word/character maxima, recommendations, editorial board-display targets and submission-form text. Check context and exact field before applying a rule. A 300-word recommendation does not fail at 301. A missing limit is not unlimited; an explicit statement of no limit is a different source finding.
- Display current/limit for known hard caps and a separate indicator for recommended length. Use the documented internal counter, with its limits; portal counting may differ on hyphens, punctuation or scripts. Require portal verification unless its algorithm is documented and reproduced. Do not use a model's word-count estimate as a final count.
- Shorten through proposals retaining source qualifiers, meaning, periods and evidence. Keep the underlying campaign evidence unchanged across festival variants; do not force board copy to equal the submission form.
- Check material, dates, permissions and eligibility separately. Official requirements and expert creative advice remain separate. A source conflict needs resolution, not an optimistic pass. External retrieval, submission and payment require their own authorisation; this skill does not grant it.

## Output and UI

Return `readiness_checks` with requirement ID, official/advice classification, source/location/date, effective scope, field/context, count/unit/method, evidence, status and limits. Status is Pass, Needs action, Not checked or Not applicable with reason. Pass refers only to that sourced check. Return reviewable shortening proposals and unresolved questions.

The UI offers a festival/year/category selector, per-variant form copy and counters, and separate Submission requirements and Creative advice views. No “Cannes approved” badge. The developer must implement blocking of applicable failed hard limits and unresolved final-logo requirements; instructions alone do not enforce exports.

## Quality checks

Does each applied rule match field, year, category and material? Are soft targets free of hard blocking? Are assumptions and unverified D&AD limits visible? Have logo quality and other craft checks been kept separate from eligibility? A fitted board, valid file dimensions or passing counters never establish permission, global submission readiness or award likelihood.
