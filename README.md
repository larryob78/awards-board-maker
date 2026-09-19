# Awards Board Studio

A local, principle-led design and writing assistant for awards case boards. Describe your campaign, add optional artwork, generate a designed draft, then refine and review it. Reference boards inform the assistant behind the scenes; the main workflow does not ask users to browse or select them.

## What is implemented

- **AI board generation:** grounded campaign copy and a recommended layout, automatically typeset into an editable board. Missing information is flagged. A failed response check gets at most one automatic correction attempt before returning an error. Results are copied verbatim from the supplied results field, never manufactured by the generator.
- **Three layout treatments:** Editorial, Bold and Story, with one-click switching, image framing/focus, a brand accent and an optional logo.
- **Typography studio:** Editorial, Modern, Compact and Humanist type systems; coordinated display/body roles; automatic kerning and ligatures; headline fitting; adjustable type size, leading, tracking and section spacing. Uploaded brand fonts are supported. Body text has a readable-size floor; overflow produces a warning and blocks export rather than silently disappearing.
- **Writing assistant:** sharpen, shorten or clarify headlines, supporting lines, insights, ideas, execution and results. Each suggestion has exact supporting campaign excerpts and accept/reject controls. Accepted changes can be undone if no subsequent edit conflicts. Insights are interpretations requiring review. Results edits require explicit verification and can only retain, drop or reorder complete supplied sentences or bullets.
- **Review and history:** generated copy/layout versions, original brief snapshots, applied principles, source provenance and writing events. Campaign images, logo and uploaded font are currently shared across draft versions. Review resets after editing or reopening a project. Unapproved exports retain a draft watermark.
- **Local saving:** autosave in this browser; save/open project JSON; image and font assets stay local. Saved project and export files are stored under ignored `reference-data/exports/`, with a download link for a separate copy. Browser storage can fill with large assets; save a project file when prompted.
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

The local server binds to loopback, restricts host/origin, bounds requests, verifies file formats and serves an explicit allowlist. It does not serve configuration, source Python, `.git`, private corpus files or directory listings. Do not expose this prototype publicly. Learning and generation use Google Gemini and may incur API charges. Generation sends the submitted brief and selected style references; the writing assistant sends campaign facts and selected description excerpts. Uploaded user images, logos and fonts are used locally by the renderer and do not go to the model.

Exact excerpts, valid reference IDs and numerical guards provide traceability, not proof that every AI interpretation is true. Human review is required. Confirm campaign facts, wording, visual rights, brand requirements and the applicable festival specification. The app does not verify awards eligibility or guarantee a world-class result. Output quality still depends on source facts, assets and review.

Private reference images, data, credentials, projects and exports are excluded from Git. The collection is read in place; it is not copied into the public repository. The server retains local saved files until the user manages them; there is no cloud account system, shared project database or automatic background learning.

## Verification

```sh
python3 -m unittest discover -s tests -v
node --check studio.js
node --check typography.js
```

Tests use synthetic temporary data and mocked provider calls. They cover source/award joins, sample diversity/provenance, type/length validation, unknown sections, unsupported numeric units, exact campaign excerpts, interpretation status, result-preservation, writing proposal safety, local origin/private-file protection and export roundtrips.

Live verification must additionally exercise generation, writing accept/undo, the three layouts and typography presets, image/font uploads, autosave/reopening, and PNG/PDF output at desktop and mobile widths. Fitting and expert aesthetic judgement are different checks: readable, unclipped text does not establish that the composition is award-worthy. For product release, compare representative real campaigns with a senior designer's assessment of hierarchy, typography, storytelling, evidence and brand fit, and retain revision feedback.

Provider reference: [Gemini generateContent API](https://ai.google.dev/api/generate-content).

## GPT Image as the primary image model

The image studio uses OpenAI GPT Image 2.5 Sunburst through Runway (`gpt_image_2_5_sunburst`). It requests one high-quality image per click, in portrait, square or landscape. It never silently falls back to another model. Writing and layout assistance continue to use the existing text provider. Model and request fields verified against [Runway documentation](https://docs.dev.runwayml.com/api.md) on 19 September 2026.

Configure `runway_secret_ref` in ignored `references.local.json` with a verified 1Password secret reference (`op://vault-id/item-id/field-id`), plus `runway_account` if needed. The 1Password CLI must be installed and the vault unlocked/CLI access approved. Alternatively inject `RUNWAYML_API_SECRET` or `RUNWAY_API_KEY` into the server environment. Never paste credentials into browser controls, project JSON or tracked files. Secret references contain identifiers, not secret values. Keys are retrieved server-side and cached only in process memory for ten minutes.

Only the image description is sent to Runway. Uploaded campaign images, logos and reference boards are not included. Generation consumes existing Runway credits. The result is a proposal: use it explicitly or keep the current image. Accepted generated images are labelled as AI concepts on the board, retained inside saved projects, and clear human approvals. They are not evidence of actual campaign execution.

Task receipts and completed image bytes are saved under ignored `reference-data/image-jobs/`. The browser remembers the last request ID; use **Check existing image** after a refresh or network interruption. A duplicate request ID never submits twice. An uncertain submission is retained as UNCONFIRMED and must be checked in Runway before deliberately starting another generation. No provider error bodies, API keys or signed media URLs enter browser responses.

Local mocked-provider tests cover the request contract, duplicate-charge prevention, restart recovery, vault failures and output-host restrictions. A successful live provider test is a separate acceptance gate; choosing a model or supplying a secret reference alone does not prove access.
