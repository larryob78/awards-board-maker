# Awards Board Skills

**Version 1.0 · authored specification · 19 September 2026**

Twelve reusable skills to help people make clear, distinctive and credible campaign boards without needing to master design terminology. They support human judgement through practical diagnoses, original options and reversible edits. They do not promise an award or certify world-class quality.

**This is an app-specific portable specification. It is not wired into Awards Board Studio.** Adding these `SKILL.md` files does not activate the web app, and the app does not automatically discover them. Nothing was installed into global Codex skills, no application source or provider settings were changed to create this pack, and no paid analysis was run.

The pack uses original procedural expertise. It does not use the 6,302-reference collection, the prior 16-board outputs or the derived learned-principle library. The existing [permissioned-system architecture proposal](ARCHITECTURE-PROPOSAL.md) remains preserved. Converting material into skills does not itself clear copyright; collection rights require separate investigation.

## Skill map: what appears in the product

| Skill | When selected | What the user receives |
|---|---|---|
| [Problem and brief](awards-problem-brief/SKILL.md) | The challenge needs explaining | Clear problem copy, objective and separate campaign/presentation gaps |
| [Insight](awards-insight/SKILL.md) | Audience tension needs grounding | Observation versus interpretation, concise insight and evidence dependencies |
| [Idea](awards-idea/SKILL.md) | The creative mechanism needs explaining | Idea copy and explanatory headlines, separate from campaign title |
| [Execution](awards-execution/SKILL.md) | What actually happened needs clarity | Deployment-aware narrative and an evidence-linked action sequence |
| [Results and evidence](awards-results-evidence/SKILL.md) | Claims need grounding | Objective-linked evidence cards, defensible wording and visible missing information |
| [Visual storytelling](awards-visual-storytelling/SKILL.md) | The hero or supporting sequence is unclear | Asset shortlist, crop/sequence briefs, captions and visible concept labels |
| [Visual prompts](awards-visual-prompts/SKILL.md) | Original concept imagery needs art direction | Precise prompt proposals, verified capability bindings and authentic-logo overlay plan |
| [Brand and logo](awards-brand-logo/SKILL.md) | Identity placement or final logo quality needs checking | Authentic asset/variant selection, placement proposals and measured quality requirements |
| [Composition and hierarchy](awards-composition-hierarchy/SKILL.md) | The reader needs a better route through the idea | Three structurally different directions using identical approved facts, with tradeoffs |
| [Typography](awards-typography/SKILL.md) | Type roles or fit need attention | Coordinated type roles, editable spacing/line breaks, font checks and targeted fit warnings |
| [Art direction critique](awards-art-direction-critique/SKILL.md) | An existing board needs review | Up to three annotated improvements, before/after previews and accept/edit/reject |
| [Award readiness](awards-award-readiness/SKILL.md) | A specific submission needs checking | Dated, category-specific requirements checklist, separate from creative advice |

All 12 skills read the [shared contract](shared/CONTRACT.md). Keep the whole directory together when distributing it; those links are part of the pack. Each folder has valid skill frontmatter and a distinct scope. No additional Codex UI metadata is needed for this app-specific package.

## How they work together

Begin with campaign facts and permissions. Problem/Brief, Insight, Idea, Execution and Results each own their section. Evidence review limits what can be claimed. Visual storytelling and prompt craft develop imagery that explains the mechanism; brand/logo review protects the authentic identity. Composition offers three different ways to organise the same approved material. Typography refines the selected direction using actual renderer measurements. Art direction reviews the rendered result. Award readiness runs only against a selected festival, year, category and authoritative rules.

This is a suggested flow, not a requirement to call 12 models for every edit. A line-spacing request needs typography and relevant renderer feedback. A new result claim needs evidence review before stronger copy. A changed headline may require writing and fit checks, not another full campaign diagnosis. Preserve previous work and reuse only checks still valid for the current version.

The main UI remains the board, a small list of useful proposed changes and a collapsible evidence panel. Use words alongside colours: Needs evidence, Needs review, Not checked. Do not add a dashboard of opaque quality scores.

## Current status

| Layer | State | What has actually been delivered |
|---|---|---|
| Twelve skills and shared contract | Authored | Markdown instructions, triggers, outputs and quality checks |
| Developer integration design | Authored, not implemented | Proposed loading, versioning, rendering and acceptance flow below |
| Format and package checks | Recorded separately | See [validation report](evaluations/VALIDATION.md) for actual results |
| Skill behaviour | Limited model-based exercise | Historical exercise summarized in the validation report; no live app behaviour test |
| App integration | Not wired | These files have no automatic runtime integration |
| Provider configuration | Unchanged | Astra/Gemini roles are proposals; no new access or credentials claimed |
| Corpus permissions and learning | Separate unresolved work | No reference collection used to author or evaluate this pack |

## Practical developer integration plan

### 1. Load only relevant server-side guidance

Add a versioned pack registry in the application's server layer, explicitly mapping 12 allowed skill IDs to their paths, versions and file hashes. The mapping is application configuration, not model-generated paths. Validate the shared contract and required files at startup. Never load an arbitrary path supplied by a user or returned by a model.

Expose plain actions such as “Clarify the idea”, “Improve the wording”, “Explore layouts” and “Review this board”. Resolve the primary action server-side. A model may recommend another allowed skill, but the orchestrator decides whether the scope warrants it. Load only the selected guidance and relevant project fields, plus the common contract. Treat uploaded text and rule extracts as data rather than instructions.

For a corpus-independent integration, explicitly omit existing reference retrieval and the learned-principle library from this route. Skill prose alone cannot enforce that isolation. Keep any future cleared-reference route separate, permission-filtered and optional. Verify this separation before calling the integrated mode corpus-independent.

### 2. Freeze inputs and validate outputs

Create a project snapshot with a base version, facts, source locations, asset permissions, canvas, target award, user locks and current render report. Normalise missing fields to Unknown; do not invent defaults for award category, evidence or rights. The fictional fixtures in this pack are task inputs, not complete production API payloads.

Implement a typed output schema for the envelope described in the contract and skill-specific findings. Reject malformed output, non-existent fact/asset/element IDs, unsupported operations and out-of-scope edits. Do not execute free-form HTML, paths or commands returned by a model. Do not apply a partially validated mutation. One bounded repair using the validation errors may be offered if separately permitted by the runtime/cost policy; after failure, retain the draft and explain the issue.

### 3. Separate constraints from model judgement

Models propose grouping, emphasis, crop intent, type roles and wording. The existing app renderer applies geometry, font shaping and canvas constraints. It returns actual loaded fonts, text bounds, clipping, overlaps, effective asset resolution and export metadata, tied to the version rendered.

Use deterministic checks for numeric calculations, required fields, source references, permissions, locked elements and renderer measurements. Text checks cannot establish causal support; geometry cannot establish taste. When a check lacks sufficient evidence, mark it Not checked. Render three layout proposals from the same fact snapshot before comparing their legibility or making pixel-level claims.

### 4. Review before applying

Use model review to challenge factual implications, explanatory clarity, unnecessary repetition and visual tradeoffs. Proposed roles are Astra synthesis/review, optional Gemini image observation and deterministic checks/rendering. The developer must verify available models, data-processing terms, permissions and cost controls before configuring any provider calls. This pack does not authorise those calls.

Show changes by target with reason, evidence and consequences. Provide accept/edit/reject and preview. Human acceptance creates a new immutable version; it does not certify that an inference is true. Check the base version before apply. A stale proposal must be regenerated or explicitly reconciled, never silently merged over a more recent edit.

### 5. Store evidence and enable recovery

Keep originals, exact source bindings, input snapshots, selected skill versions/hashes, actual model identifiers when used, render checks, proposals and acceptance records. Isolate projects and clients. Save each accepted version and preserve an undo path. Do not store credentials in these records.

Track dependencies so changed facts, assets, fonts, rules or layout invalidate affected checks. Export records the actual version, approval state and remaining limitations. Draft exports retain concept labels and unresolved-state disclosure. Final submission readiness must follow sourced rules and explicit human review, not an overall AI score.

### 6. Integrate in small, reviewable slices

Proposed first slice: the five narrative section skills in a review panel, with no automatic canvas mutation. Next: visual planning and prompt proposals, three layout previews, typography and brand/logo checks. Then annotated critique and sourced award-readiness checks. Agree this scope before implementation; these are developer recommendations, not a current work order.

Acceptance for an implemented slice should include: facts survive rewrites; invented IDs and stale edits are rejected; no credential/API use occurs without runtime authorisation; locked choices and concept labels persist; an accepted change creates a recoverable version; renderer checks detect real overflow; unknown festival rules remain Not checked. Test in an isolated project with the fictional fixtures before any real client material.

### 7. Make brand/logo quality an enforced release condition

Require the approved brand-specific logo on every final board. Keep missing/poor-source cases saveable as drafts, but block the final-quality export path server-side when the logo is absent, fails checks or remains unmeasured. A warning alone is insufficient. This requirement is authored, not currently enforced by this pack. An official submission rule that conflicts with branding must be resolved explicitly for that variant, never bypassed silently.

Validate uploaded assets safely before use: allowlisted formats, byte and decompression limits, MIME/content agreement and orientation handling. SVG processing must reject or safely remove active content, scripts, event handlers, foreign objects and external fetches; do not trust a file extension. Inspect for embedded raster content and preserve the authentic visual geometry after sanitisation. Keep the original private asset and record the validated derivative; never silently alter the identity. Use a vetted parser/rasteriser in an isolated, resource-limited process rather than rendering arbitrary SVG as trusted application markup.

At final placement, check intrinsic and embedded-raster dimensions, effective resolution, aspect ratio, transparent edges, approved colour/reversed variant, contrast, supplied clearspace/minimum size and actual exported clarity. For screen output compare source pixels with required placed output pixels; for print calculate effective pixels per inch from physical placement and choose an appropriate target for the stated printing/viewing conditions. There is no universal DPI threshold. A smaller placement is acceptable only if brand rules and legibility still hold. Otherwise request a genuine master; do not offer AI recreation or sharpening as a replacement.

The current Studio is documented to export a 7000 × 4950 PNG and a raster A2 PDF. Integration must inspect actual output metadata rather than assume dimensions remain fixed. A vector logo input does not make that PDF vector. Check both the export at its actual resolution and a realistic viewing preview. Logo/font/type elements remain separate from generated campaign imagery.

### 8. Provide sector context, festival variants and honest counters

Use a short searchable sector picker with free-text custom entry and optional multiple tags. Starting examples: Automotive, Food & Drink, Fashion & Beauty, Technology, Retail, Financial Services, Health, Public/Nonprofit. Offer optional subsector, market and audience details, such as alcoholic/nonalcoholic drinks. AI may suggest tags; users can correct them. Tags inform questions and visuals without forcing a template or implying legal compliance.

Keep official festival programme/category/subcategory IDs separate. Offer versioned, expandable adapters for Cannes Lions, D&AD, The One Show, Clios and New York Festivals; unknown/custom targets stay usable with Not checked requirements. Preserve one approved evidence record and create separate variants for each target.

Distinguish hard word/character limits from recommendations, editorial board-display targets and submission-form copy. [Limited source examples](shared/FESTIVAL-ADAPTERS.md) illustrate the differences. A known applicable hard cap may block a final submission variant, while a soft target never should. Unknown requirements cannot be marked ready. The supplied [internal counter](shared/count_copy.py) documents its convention; it does not replicate every portal. Require final portal verification where the official counting method is undocumented. Shortening is always proposed and accepted without losing qualifiers.

### 9. Offer intuitive original layout presets

Treat 12 preset families as starting structures: balanced 50/50 image/text; dominant hero with a quiet evidence rail; panoramic execution with story beneath; three-step sequence; documented comparison; modular execution grid; system/network map; evidence-led argument; typographic mechanism; annotated product/detail; audience encounter with supporting context; editorial narrative with inset proof. These are original choices, not medal-derived templates.

Show plain names and simple wireframes. Choose three genuinely different recommendations based on the same facts, brand/logo needs and canvas; do not run all presets or claim all suit every case. Reflow per format and retain readable copy, sources and a quality-checked logo. Later comparisons across Grand Prix, Gold, Silver or Bronze remain optional evaluation work, not proof that medal status validates a layout.

## Evaluation and next action

The [evaluation guide](evaluations/README.md) describes seven wholly fictional inputs, expected invariants and the limits of the model-based exercise. No images were generated, no original campaign corpus was read, and no paid API calls were made. Format validity is not proof of excellent design behaviour.

**Next action: The project owner and developer review and agree the app integration scope.** Corpus-rights investigation continues separately. The 6,302-board collection remains a separate optional later comparison. The project owner can later decide whether to evaluate if multimodal meaning/layout analysis improves results. It has not been run or approved here; rights uncertainty does not block original skill drafting. The earlier roughly 100-campaign pilot is preserved as an unapproved historical proposal.
