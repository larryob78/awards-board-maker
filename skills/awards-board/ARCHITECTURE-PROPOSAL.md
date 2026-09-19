# Awards Board: a permissioned creative system

**Design proposal, 19 September 2026. Not implemented or legally cleared.**

Purpose: help people turn their own campaign evidence into original, beautifully designed awards boards, with expert writing support and transparent human control.

Proposed direction: use Astra for deep reasoning and system design; make strong use of visual analysis; prioritise legitimate use of third-party material. This document specifies intended model roles, not a verified runtime change.

## Scope and implementation status

This is a preserved architecture proposal, not a statement that its controls are implemented. See the [application README](../../README.md) for implemented behaviour and the [skill integration guide](START%20HERE.md) for the proposed bounded integration. No provider settings or runtime code change as part of saving this proposal. Collection rights, provider terms and any future analysis scope remain separate gates.

## The main learnings to build into the product

**Design direction:** focus now on the strongest creative and design capabilities while collection permissions are investigated. The following are proposed expert heuristics, not claims extracted or statistically validated across the collection.

### 1. Establish why the idea deserves attention

Separate campaign quality from presentation quality. Identify the audience problem, the unexpected insight, what the brand actually did differently and the evidence that it mattered. If these are weak or missing, surface the gap. Do not let impressive graphics conceal an unclear idea. The system can suggest questions and narrative alternatives; it cannot manufacture a better campaign history.

Product behaviour: a concise diagnosis before design, with one central idea and the three most consequential gaps. Distinguish “the campaign needs evidence” from “the board needs better communication”.

### 2. Make the headline explain the creative mechanism

A campaign title, advertising slogan and explanatory board headline serve different jobs. Keep the campaign name, but develop an explanatory headline that tells a juror what the intervention was and why it is interesting. Test whether a reader can explain the idea after seeing the headline and hero alone. Avoid vague self-praise and a headline that promises more than the facts establish.

Product behaviour: offer meaningfully different headlines with a short explanation of what each clarifies. Preserve exact client claims and let the user choose.

### 3. Build an argument with a visible chain

Insight, idea, execution and results should explain one another. An insight is more than a market statistic: it identifies a relevant tension. Execution explains how the idea became real. Results answer the original objective. A board need not give each section equal space or use identical labels every time.

Product behaviour: map the connections, identify unsupported jumps and recommend emphasis based on the actual strength of the campaign. Never claim causal impact merely because events occurred together.

### 4. Use a hero image that proves something

The main visual should demonstrate the idea or its execution, not simply decorate the page. Depending on the work, the strongest evidence may be a product in use, a striking activation, a diagram, a sequence or a close-up. Every supporting image should contribute new information.

Product behaviour: propose a specific visual brief, crop and annotation; explain what the image needs to show. Detect repeated or irrelevant imagery. Label mock-ups and AI concepts so they cannot be confused with real executions.

### 5. Design for successive levels of attention

Create an immediate understanding of the idea, a short reading path through the story and a deeper path into proof. As a pilot heuristic, test approximately five-second, thirty-second and detailed viewing. These are product evaluation exercises, not Cannes timing rules.

Product behaviour: thumbnail preview, reading-order overlay, full-size legibility checks and comprehension tests with human reviewers. Use objective geometry and contrast checks alongside visual review. Do not pretend an AI attention prediction is real eye-tracking evidence.

### 6. Treat typography as an editorial system

Set roles for title, explanatory headline, body, captions and evidence. Control measure, line breaks, type contrast, leading, tracking, alignment and spacing as a coherent whole. When content does not fit, edit or recompose before reducing it to unreadable text. Intentional whitespace creates hierarchy; it is not unused space to fill.

Product behaviour: authored type systems and constraint-based layout, with brand fonts where licensed. Show exactly where text overflows or becomes too small at the intended output size. Protect headline meaning when shortening.

### 7. Match the composition to the kind of idea

Three existing styles are a useful start. A more capable system offers original structural families: one decisive hero; a process sequence; a meaningful comparison; a system/network diagram; an evidence-led case; or a typographic idea. Choice follows the communication problem and brand character. It does not follow a universally fashionable style.

Product behaviour: generate three structurally different treatments from identical approved facts. Explain what each foregrounds and what it gives up. Preserve brand distinction while allowing creative judgement to override the recommendation.

### 8. Make results concrete, proportionate and credible

A large number without a timeframe, baseline or relevant objective can be misleading. Distinguish exposure from behavioural change and business outcomes. Separate measured results, estimates, attributed outcomes and claims awaiting verification. If evidence is modest, present it honestly rather than inflating it.

Product behaviour: create evidence cards with the claim, unit, period, baseline, source and measurement limitations. Keep them linked to the relevant objective. Missing data becomes a request, never an invented result.

### 9. Turn critique into an editable improvement

“Make it more premium” is not useful guidance. A review should locate the issue, explain its effect and propose a bounded change: for example, shorten this headline, move this proof beside the claim, increase separation between these two groups, or remove a redundant image.

Product behaviour: highlight the exact canvas area, preview a before/after change, show any affected facts and allow accept, edit, reject and undo. Prioritise three high-impact changes rather than twenty minor corrections. Assess improvement with the user, not solely with the model that proposed it.

### 10. Learn from professional judgement without creating sameness

Record why experienced writers and art directors keep, change or reject a suggestion. Use approved feedback to improve the review rubric and authored design systems. Distinguish one reviewer's preference from a broadly useful principle; preserve counterexamples and alternative styles.

Product behaviour: permissioned evaluation cases and reviewer rationale, versioned with each release. Test new behaviour on unseen campaigns. Measure whether boards become clearer and more distinctive, rather than merely closer to a house template.

### Build priorities

1. **Story diagnosis and evidence:** establish the central idea, expose gaps, keep factual claims grounded.
2. **Composition and typography:** create genuinely different original directions with dependable reading order and legibility.
3. **Visual critique and revision:** propose specific improvements on the board, with before/after review and undo.
4. **Permissioned learning:** add deeper reference analysis only once clearance, evaluation and cost controls are in place.

The most valuable product promise is: **help a person make a strong campaign unmistakably clear, distinctive and credible, while keeping that person in control.** “World-class” remains a quality ambition to evaluate with expert reviewers, not an automated certification.

## 1. The user experience

1. **Your campaign.** Supply the brief, brand assets, actual executions and evidence of results. Each factual field carries a source, or is visibly Unknown. Interpretations remain labelled Inferred even after human approval; approval does not convert them into independently verified facts.
2. **Strengthen the story.** The assistant identifies the central idea, the audience tension, the mechanism connecting execution to outcomes and missing evidence. It asks the few questions that would most improve the board.
3. **Choose a direction.** Receive three original treatments using the same verified facts: for example, idea-led, execution-led and evidence-led. Each explains why its emphasis suits this campaign. Directions are not copies of reference boards.
4. **Refine on the canvas.** Edit text or speak a change. Typography, spacing and layout adapt within authored design systems. Every suggestion can be accepted, changed, rejected or undone.
5. **Review and export.** Separate views cover story, visual craft, factual evidence, rights and award requirements. Export records the approvals and unresolved issues. Drafts remain clearly labelled.

The core screen should show the board prominently, a short list of useful improvements, and a collapsible evidence panel. Avoid a dashboard of opaque scores. Use words as well as colours: Ready, Needs evidence, Needs review, Not checked.

## 2. Rights are an enforceable input rule

Owning a downloaded file or paying for access does not itself establish all rights required for commercial AI processing. Summarising a work, using embeddings, adding attribution or keeping processing local does not automatically resolve the underlying permissions.

Use a source register with owner, origin, acquisition date, permission document and version, permitted purposes, commercial-use scope, territory, expiry, approved processors, retention and attribution requirements. Record separate allowances for local analysis, external model processing, extraction, indexing, retrieval, display, output reuse and training. An analysis licence need not permit any of the other operations.

Use three explicit states: **Cleared for this operation**, **Restricted**, **Unverified**. Only positively cleared operations proceed. Filter before reading content into a model request, not only after retrieval. Access controls also isolate clients and brands.

For strongest operational certainty, prefer Napkin-owned examples with underlying asset rights checked, agency/client material with suitable written permission, commissioned teaching examples with commercial AI rights, and appropriately licensed material. Publicly visible work is not automatically public domain.

If relying on a statutory exception rather than permission, have Irish IP counsel assess the acquisition method, applicable law, database rights, rights reservations, contracts, provider processing and intended commercial use. Do not represent that assessment as completed.

The existing 16-board analysis and derived principles also need provenance review. Proposed handling is to exclude unverified-derived content from production and rebuild cleared libraries where necessary, while preserving originals and records. This exclusion has not yet been implemented.

## 3. Separate facts, permitted learning and original creation

Maintain distinct collections:

- **Client evidence:** the user's actual campaign facts and permitted assets. These are the only basis for claims about that campaign.
- **Cleared reference analysis:** structured observations whose source permissions cover the analysis and downstream use.
- **Authored design knowledge:** original typography systems, explanatory writing guidance and commissioned examples. This supports useful operation even if none of the historic collection is cleared.
- **Award requirements:** dated, category-specific rule records with authoritative links and exact scope. Quoting, copying or storing source text must respect applicable terms.

Gemini's proposed role is visual observation: text extraction, region detection, reading order and image/text relationships, using high-resolution crops where needed. OCR confidence and uncertain readings must remain visible. It should not infer exact font families, campaign facts or design quality from insufficient evidence.

Astra's requested role is synthesis and critique: challenge weak reasoning, compare source-supported interpretations, develop original narrative alternatives and explain tradeoffs. Use deterministic checks for word counts, clipping, required fields and permission enforcement. A separate review pass tests factual support and possible imitation; it is not a legal verdict.

Provider choice remains subject to model availability, data terms, retention, processing location, privacy requirements, measured quality and cost. Verify these before sending any client or collection material. API access does not establish suitable data terms.

## 4. What deeper learning can deliver

For each cleared campaign, capture the problem, audience tension, idea, execution mechanism, stated outcomes and their evidence, plus headline structure, information density, hierarchy and reading sequence. Link every extracted claim to a source location. Separate what the source claims from what independent evidence establishes.

Combine semantic and keyword retrieval, filtered by permission and client scope, then rerank for the specific task. Retrieve comparable creative problems and communication principles rather than simply matching a famous brand or medal.

Build patterns only across sufficiently diverse examples. Record supporting cases, counterexamples, limits and reviewer judgement. Split campaigns and near-duplicates across development and evaluation sets so copies cannot inflate apparent performance.

Compare award cohorts within relevant categories, years and sectors. Awards recognise the submitted work, not proof that the board layout caused success. Dataset gaps and selection bias prevent a credible promise to predict a Cannes win.

A valuable review would say: “The idea is buried beneath execution detail; state the mechanism first and move this supporting paragraph lower.” It would identify the relevant region and propose a change grounded in the user's facts. It would not merely assign an aesthetic score.

## 5. Originality and evidence controls

- Generate from the client's facts and permitted abstract guidance. Do not feed an uncleared reference board to the image model or request its distinctive composition with a new logo.
- Use original or licensed layout templates. Use brand assets, photography, illustration and fonts only within their actual licences.
- Flag suspicious text overlap and perceptual resemblance against material we are permitted to compare. There is no universal similarity threshold that proves legal safety, and a clean result is not clearance.
- Preserve asset provenance. AI concept images must not masquerade as evidence of an executed campaign.
- Never invent results, testimonials, awards or causal claims. Improvements to results copy must retain the underlying meaning and evidence.
- Respect expiry and withdrawal: disable affected retrieval and downstream artefacts, track dependencies and apply documented retention/deletion rules. Do not silently delete original source material during a review.
- Use human editorial and rights approval for release. Keep model versions, source IDs, accepted edits and approval records recoverable.

## 6. Cannes review without false assurance

A case board may support many categories; it is not automatically a Design Lions submission. Ask for the target award and year. Keep writing recommendations distinct from deterministic checks and requirements needing human verification.

The original proposal records the 2026 Design Lions criteria as weighting idea at 40%, execution at 40% and results at 20%. That is one category's rubric, not a universal scoring system. The rules service should record source date, effective competition, category, material specifications, word limits and eligibility requirements. Future rules remain unverified until authoritative guidance is available.

The product should say “checked against these sourced requirements; these points remain unresolved”, never “Cannes approved”.

## 7. Prove value before scaling

First establish usable rights. Then propose a budgeted pilot of roughly 100 diverse cleared campaigns, with a separate expert-reviewed evaluation set. If fewer are cleared, start smaller or commission examples. Do not process the full collection merely to meet a numerical target.

Compare the current Studio with the proposed system using the same campaign briefs. Use blind review by senior art directors and experienced awards writers. Assess factual faithfulness, clarity, hierarchy, originality, relevance, editability and readiness. Test source traceability, permission filtering, OCR failures, duplicate leakage, cross-client isolation and withdrawal handling.

Record time to an approved draft, rework, cost and user correction effort only when measured. No claim of improvement until evaluation supports it. Expand only when the quality, rights and budget gates pass.

## Working rhythm and human responsibility

Start with campaign evidence, let the system propose, challenge it with a creative reviewer, edit together, verify claims and rights, then approve a version for export. Keep all earlier versions. Acceptance of a suggestion is feedback, not universal truth or permission for future model training.

After each reviewed board, ask for five quick ratings: factual reliability, story clarity, visual craft, usefulness of suggestions and confidence to share. Add one note: what should the system keep, change or stop? Reuse feedback or examples across clients only with appropriate permission and de-identification.

## Sources and provenance

- [Official Irish regulations, including commercial text-and-data-mining provisions](https://www.irishstatutebook.ie/eli/2021/si/567/made/en/pdf). The provisions are conditional; this document does not conclude that the corpus qualifies.
- [EU Copyright Directive, Articles 3 and 4](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A32019L0790).
- [The Work.AI terms](https://www.lovethework.com/en/ai/terms-of-use). These govern that service and include restrictions on competitive use. They are not assumed to be the licence applicable to this collection; the collection's provenance and applicable acquisition terms remain unknown.
- [Cannes entry guide](https://www.canneslions.com/awards/awards-support/awards-entry-guide).
- [Design Lions criteria](https://www.canneslions.com/awards/lions/design/what-you-need-to-know).
- [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding).

**Unresolved:** collection provenance and permission documents; legal assessment where required; pilot scope/budget; provider data-term review; live Runway generation. No guarantee of zero copyright risk is made.
