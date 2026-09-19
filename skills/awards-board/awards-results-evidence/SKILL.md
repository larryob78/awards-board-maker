---
name: awards-results-evidence
description: "Audit evidence and draft or revise the Results section of an awards board, mapping outcomes to objectives while preserving measurement limits and claim provenance."
metadata:
  pack-version: '1.0'
---

# Results and evidence

## Triggers

Use to write results, verify claims or revise numeric and causal language. Own the narrative and evidence cards; presentation cannot establish effectiveness.

## Inputs

Read the [shared contract](../shared/CONTRACT.md). Use its `copy_context` and versioned `field_limits` for board-display versus submission-form drafts; unknown limits remain Not checked, with no universal word cap. Use the versioned snapshot, objectives, proposed claims, exact source locations, measurement definitions, periods, baselines, comparators and existing copy. Request underlying reports when summaries omit essential evidence.

## Reasoning

- Map each result to an objective. Distinguish distribution/reach, engagement, behaviour and business/social outcomes. Impressions do not establish awareness change, persuasion or sales; an objective is not evidence it was achieved.
- Record value, unit, denominator/population, period, baseline, method, source owner and limitations. Missing fields stay null/Unknown. “Not applicable” requires a reason and cannot conceal a missing comparison.
- Label measurement `measured`, `claimed`, `estimated` or `unknown`, independently of fact provenance. A sourced client estimate remains estimated. “Measured” requires a described observation method, not confident wording.
- Reconcile conflicting sources visibly. Check percentages versus percentage points, totals versus unique people, repeat events, overlapping channels and incompatible periods. Never sum potentially overlapping counts without a justified method.
- Allow transparent calculations only with explicit inputs, formula and denominator. Preserve raw and derived values, label calculations and verify arithmetic deterministically. A before/after difference may be described without attributing it to the campaign.
- Require suitable causal evidence for caused, drove, generated or attributable uplift. Never invent a counterfactual, baseline, testimonial, conversion rate or independent verification.
- Draft the strongest defensible account of observed change, prioritised by the stated objective. When evidence is sparse, report what is known and its limits; leave unsupported outcomes absent. Preserve attribution and qualifiers when shortening.

## Outputs

Return `evidence_cards` with objective, original claim, defensible wording, fact/source IDs, measurement label, value/unit/period/baseline/method and limitations. Include `section_copy`, word count, conflicts and consequential evidence gaps.

Use the shared proposal envelope for targeted before/after revisions, with a `meaning_change_log` distinguishing correction from stylistic compression. Bind every factual clause, preserve original claims and sources, and keep acceptance reversible. Changed claims invalidate earlier evidence checks.

## UI

Show “Supported within these limits”, “Needs evidence” or “Not checked”, alongside measurement labels and source links. Keep caveats attached to the relevant figure. Offer accept/edit/reject without hiding uncertainty after acceptance.

## Quality checks

Confirm campaign/version, population and period match each source. Review causal language separately from arithmetic. A numeric pass cannot prove source truth or survey representativeness. Record only checks actually performed; unverified calculations or visual fit remain Not checked.
