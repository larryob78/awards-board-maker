# Awards Board Studio

A local, principle-led design and writing assistant for awards case boards. Describe your campaign, add optional artwork, generate a designed draft, then refine and review it. Reference boards inform the assistant behind the scenes; the main workflow does not ask users to browse or select them.

## What is implemented

- **AI board generation:** grounded campaign copy and a recommended layout, automatically typeset into an editable board. Missing information is flagged. A failed response check gets at most one automatic correction attempt before returning an error. Results are copied verbatim from the supplied results field, never manufactured by the generator.
- **Three layout treatments:** Editorial, Bold and Story, with one-click switching, image framing/focus, a brand accent and an optional logo.
- **Typography studio:** Editorial, Modern, Compact and Humanist type systems; coordinated display/body roles; automatic kerning and ligatures; headline fitting; adjustable type size, leading, tracking and section spacing. Uploaded brand fonts are supported. Body text has a readable-size floor; overflow produces a warning and blocks export rather than silently disappearing.
- **Writing assistant:** sharpen, shorten or clarify headlines, supporting lines, insights, ideas, execution and results. Each suggestion has exact supporting campaign excerpts and accept/reject controls. Accepted changes can be undone if no subsequent edit conflicts. Insights are interpretations requiring review. Results edits require explicit verification and can only retain, drop or reorder complete supplied sentences or bullets.
- **Review and history:** generated copy/layout versions, original brief snapshots, applied principles, source provenance and writing events. Campaign images have a separate original/revision/proposal history; the currently selected image, logo and uploaded font are shared across board draft versions. Review resets after editing or reopening a project. Unapproved exports retain a draft watermark.
- **Local saving:** browser IndexedDB holds the board, assets and image history, with a lightweight pointer under the existing localStorage key. Existing browser drafts migrate at the same origin. Save/open project JSON includes image originals, revisions and request receipts; Save project creates a local download directly, without the image-export request cap. PNG/PDF exports are stored under ignored `reference-data/exports/`. Browser storage can fill with large assets; download a project for a separate copy.
- **Exports:** PNG and raster A2 landscape PDF. The export canvas is 7000 × 4950 pixels, approximately 300 dpi at A2. Source-image resolution still limits image detail; PDF text is rasterized, not editable/vector type. Files must be under 20 MB.

## Run

Requires Python 3.10+ and a modern browser. No frontend build step.

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
cp references.example.json references.local.json
# Edit the local configuration to reference your existing private files.
python3 reference_server.py --port 8766
```

Open http://127.0.0.1:8766/. Keep the server running. `--port` can be changed. The previous manual editor is preserved at `/classic`; Studio is the default page. A static file host alone cannot run AI or local saving.

### Private configuration

- `board_dir`: existing JPG collection, named `YEAR_CAMPAIGNID_Title.jpg`. Duplicate campaign images become one retrieval record; originals are never modified.
- `metadata_csv`: optional campaign metadata with `id`, `title`, `brand`, `agency`, `campaignUrl`, `highestAward` and available award counts.
- `campaign_json`: optional list of richer entries with `title`, `year`, `sections`, `ogDesc`, `url`, `awardLevel`. Description joins are deliberately conservative where entry and campaign identifiers differ.
- `source_label`: friendly corpus name. `drive_folder_url` is a provenance note only, not a Drive sync connection.
- `model`: provider model ID, currently `gemini-3.6-flash` in the verified local setup.
- `principles_file`: optional path to the learned private library; defaults to `reference-data/principles.json`.
- Set `GOOGLE_API_KEY` or `GEMINI_API_KEY` in the server environment. Alternatively, `credentials_file` may point to an existing private dotenv file with one of those variables. Never put a key in client code or committed JSON.

## Learn from the collection

```sh
python3 learn_principles.py --sample-size 16
```

The learner scans every JPG locally for dimensions, brightness, saturation, image entropy and edge density. A cached scan is reused when file size/mtime signatures match. These are pixel measurements, not semantic reviews or scores of design quality.

It then sends a bounded sample of images to Gemini for reusable typography, layout, writing and evidence principles. Deterministic sampling mixes visual variation and award cohorts, favouring Grand Prix/Titanium and Gold while retaining Silver, Bronze, shortlist and uncertain metadata comparisons. Richer award evidence is reconciled only with exact IDs or unambiguous campaign title/year matches. Medal metadata remains incomplete; an award is a campaign honour, not proof that a board's design caused success.

Every learned principle has a rule, visible observation, conditions, pitfalls and checked sample citations. The library is saved atomically only after validation and remains private. No model weights are fine-tuned. This is a reusable principle library applied through prompts and deterministic typography/layout rules.

Verified local learning pass, 19 September 2026: **6,905 readable JPGs scanned, 6,302 campaigns indexed, 16 boards visually reviewed by AI**. The final sample includes 4 Grand Prix/Titanium, 4 Gold, 3 Silver, 2 Bronze, 2 shortlist and 1 unknown. It produced 12 learned rules plus 6 editorial safeguards. This is not a visual analysis of all 6,302 campaigns. Another checkout needs its own private data and learning pass; otherwise generation uses the editorial foundation rules with honest zero learning counts.

During board generation, BM25 keyword retrieval also selects up to three relevant reference images automatically. The model uses them for visual hierarchy only; it never places their art in the user's board. Writing retrieval uses up to four relevant available descriptions, with modest award weighting and original-copy guards. Retrieval is keyword-based, not semantic vector search or corpus-wide OCR.

## Evidence and privacy

The local server binds to loopback, restricts host/origin, bounds requests, verifies file formats and serves an explicit allowlist. It does not serve configuration, source Python, `.git`, private corpus files or directory listings. Do not expose this prototype publicly. Learning and generation use Google Gemini and may incur API charges. Generation sends the submitted brief and selected style references; the writing assistant sends campaign facts and selected description excerpts. Ordinary image uploads, selection drawing, logos and fonts stay local. An explicit Image Craft generate/edit request sends its prompt and chosen image reference or contextual crop to Runway; the panel explains this before submission. Board typography and logos are separate from this request.

Exact excerpts, valid reference IDs and numerical guards provide traceability, not proof that every AI interpretation is true. Human review is required. Confirm campaign facts, wording, visual rights, brand requirements and the applicable festival specification. The app does not verify awards eligibility or guarantee a world-class result. Output quality still depends on source facts, assets and review.

Private reference images, data, credentials, projects and exports are excluded from Git. The collection is read in place; it is not copied into the public repository. The server retains local saved files until the user manages them; there is no cloud account system, shared project database or automatic background learning.

## Verification

```sh
python3 -m unittest discover -s tests -v
node --check studio.js
node --check typography.js
node --check image-craft.js
node tests/image_craft_test.js
```

Tests use synthetic temporary data and mocked provider calls. They cover source/award joins, sample diversity/provenance, type/length validation, unknown sections, unsupported numeric units, exact campaign excerpts, interpretation status, result-preservation, writing proposal safety, local origin/private-file protection and export roundtrips.

Live verification must additionally exercise generation, writing accept/undo, the three layouts and typography presets, image/font uploads, autosave/reopening, and PNG/PDF output at desktop and mobile widths. Fitting and expert aesthetic judgement are different checks: readable, unclipped text does not establish that the composition is award-worthy. For product release, compare representative real campaigns with a senior designer's assessment of hierarchy, typography, storytelling, evidence and brand fit, and retain revision feedback.

Provider reference: [Gemini generateContent API](https://ai.google.dev/api/generate-content).

## Image Craft and the primary GPT image model

Image Craft defaults to GPT Image 2.5 Sunburst through Runway (`gpt_image_2_5_sunburst`). Users can explicitly select Runway Gen-4 Image or Gen-4 Image Turbo; Turbo requires a reference image. There is no automatic fallback or resolution upgrade. Native resolution choices come from the model contract, including Sunburst landscape 3840 × 2160, portrait 2160 × 3840 and square 2880 × 2880. Model fields were checked against [Runway documentation](https://docs.dev.runwayml.com/api.md) and its [image-input requirements](https://docs.dev.runwayml.com/assets/inputs/) on 19 September 2026. Listed capability is not proof of working credentials or a successful live model call.

Configure `runway_secret_ref` in ignored `references.local.json` with a verified 1Password secret reference (`op://vault-id/item-id/field-id`), plus `runway_account` if needed. The 1Password CLI must be installed and the vault unlocked/CLI access approved. Alternatively inject `RUNWAYML_API_SECRET` or `RUNWAY_API_KEY` into the server environment. Never paste credentials into browser controls, project JSON or tracked files. Secret references contain identifiers, not secret values. Keys are retrieved server-side and cached only in process memory for ten minutes.

Choose a new image, whole-image edit or selected-area edit. Rectangle, lasso and brush selections describe the editable area in original image coordinates. Runway's documented text-to-image endpoint has no native mask parameter. Selected-area editing therefore sends an image-guided contextual crop, then locally composites the proposal through the original selection mask. Feathering acts inward only; decoded RGBA pixels outside the selection remain identical. This does not guarantee that the model follows instructions, retains alignment or produces invisible seams. Inspect the proposal before applying it.

Local sources and lossless outputs are bounded at 84 MB, 20 million pixels and an 8192-pixel side; masks are bounded at 8 MB. This accommodates larger PNG revisions without a lossy rewrite of protected pixels. Provider references are separately bounded to Runway's 5 MB encoded-data limit and may be reduced in resolution while the original stays intact. Their mapping is retained. Invalid formats, animated images, mismatched mask dimensions and unapplied EXIF orientation are rejected before a provider request. Project imports are bounded separately; very long histories may need a smaller working project and preserved earlier backups.

Every generate/edit click is a paid provider operation. Exact total pricing is not currently estimated by this app; larger native sizes may cost more. The result remains a proposal until accepted. Image revisions preserve originals, prompts, model and provenance, with restore/undo. Accepted generated images are labelled as AI concepts and clear human approvals. They are not evidence of actual campaign execution. Source/reference images are sent only by an explicit request; the private reference-board collection is not used by Image Craft.

The effective-resolution readout uses the source pixels available after the current crop at the actual board placement. A 7000 × 4950 export does not create additional photographic detail. There is no universal Cannes DPI check. Optional provider upscaling is planned, not enabled or tested: prefer suitable native dimensions first; any later upscale must preserve the original and require its own review. Never use generated detail to certify an authentic logo or campaign execution.

Task receipts, original edit inputs and completed image bytes are saved under ignored `reference-data/image-jobs/`. The browser retains the request ID before submitting. Resume/check reads the existing task, without creating another paid request. A reused ID with different inputs is rejected. An uncertain submission is retained as UNCONFIRMED and must be checked in Runway before deliberately starting another generation. Stopping the browser's watch does not cancel provider billing. No provider error bodies, API keys or signed media URLs enter browser responses. These files are local recovery data, not a cloud backup; use project downloads for a separate copy.

Local mocked-provider tests cover the request contract, duplicate-charge prevention, restart recovery, vault failures and output-host restrictions. A successful live provider test is a separate acceptance gate; choosing a model or supplying a secret reference alone does not prove access.
