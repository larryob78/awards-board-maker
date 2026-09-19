# Festival adapters and copy limits

**Design examples, checked 19 September 2026. Not an exhaustive or live rule database.** These examples demonstrate why field/context/year matter. Authoritative pages can change; record an effective scope and retrieval date, check category exceptions and confirm the submission portal. No future-season rules are established here.

| Adapter | Limited source finding | Treatment and scope |
|---|---|---|
| Cannes Lions | The 2026 Design written-submission fields for creative idea, execution and results each have a 150-word maximum. [Official Design guidance, Written Submission, questions 5–7](https://www.canneslions.com/awards/lions/design/what-you-need-to-know) | Hard word limits for those fields in that programme/year. Not a 150-word total board limit or a rule for every Lion. |
| The One Show | Its 2026 general information requirements list 300-word maxima for background, creative idea, insights/strategy, execution and results; individual category requirements still matter. [Official 2026 guide, PDF page 15](https://oneshow.org/downloads/2026-OneShow-Entry_Guide.pdf) | Hard per-field limits where applicable, subject to category-specific guidance. Not an automatic board-density target. |
| Clios | The general FAQ states no minimum or maximum synopsis length and recommends roughly 300 words. [Official FAQ, synopsis question](https://clios.com/entry-information/frequently-asked-questions/) | Soft recommendation, never a 300-word hard gate. FAQ was retrieved in 2026 but is not a season-specific rule grant; verify the chosen programme/year. |
| New York Festivals | The 2026 Advertising guide specifies an 800-word jury brief and 400-word limits for the listed additional fields for Commerce/Creativity and Creative Marketing Strategy/Effectiveness (including the specified Future Now grouping). [Official guide, Entry Process and Piece Details](https://home.nyfadvertising.com/entry-guide) | Different scopes and fields. Preserve their official names and check exact category applicability. Do not apply a 400-word limit globally or collapse it into the jury brief. |
| D&AD | The [official 2026 submission guide](https://media.dandad.org/documents/Entry_Submission_Guide_2026_ENG.pdf) was located and opened. Exact text-field limits were not verified for this pack. | All relevant field limits remain Not checked until the actual category/field requirements are read and recorded. |

These are paraphrased source findings, not full extracts or blanket eligibility checks. No examples establish portal counting algorithms or validate any project's eligibility.

## Proposed adapter record

An adapter identifies `festival_id`, display name, `season_year`, `programme_id`, `category_id`, `subcategory_id`, `material_type`, adapter version and source version. Each rule identifies its official field, copy context, unit, hard/soft/editorial kind, value, known/no-limit-stated/not-checked state, URL/location, retrieval date and applicability conditions. An empty category is not a wildcard match.

Permit multiple rule records per field, including both a hard maximum and separate editorial recommendation. Never overwrite a source rule with a preferred shorter target. Conflicts stay unresolved with both source records retained. Retrieval dates describe when a source was read, not a promise that requirements remain current.

Unknown and custom festivals can exist as user targets with Not checked rules. Adding a festival requires a new reviewed adapter, not a silent fallback to Cannes. Cross-festival variants share approved campaign evidence but own their text, field mappings, counts and review state.
