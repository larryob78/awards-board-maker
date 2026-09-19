# Awards Board Maker

This project provides a simple web‑based tool to design **A2 landscape award boards** for creative festivals such as the Cannes Lions. Each board includes a key image, a logo, and copy for the brief, insight, idea, execution and results. You can create multiple boards, preview them live, and export them as a single PDF or individual PNG files.

## Features

* **Multiple boards** – Add or remove boards and switch between them from the dropdown selector.
* **Live preview** – Changes to images, text or fonts update the preview immediately.
* **Image uploads** – Upload a key image and logo for each board (supports any image format your browser can display).
* **Custom fonts** – Upload a `.ttf` or `.otf` file to apply your brand font to the board copy. The font is embedded via a data URI and applied only to the board you are editing.
* **Export** – Export all boards into a multi‑page PDF (landscape A4 by default) or export the current board as a standalone PNG file. The PDF export uses [`html2canvas`](https://html2canvas.hertzen.com/) and [`jsPDF`](https://github.com/parallax/jsPDF) loaded from a CDN at runtime.

## Usage

1. Open `index.html` in a modern web browser.
2. Use the **Board Settings** sidebar to add a new board or select an existing one from the dropdown.
3. Upload your **Key Image**, **Logo**, and **Brand Font** (optional) using the file inputs.
4. Type your copy for **Brief**, **Insight**, **Idea**, **Execution** and **Results** in the respective text areas.
5. Repeat steps 2–4 for each board you wish to create.
6. Click **Export PDF** to download all boards as a single PDF file, or click **Export PNG** to download the currently selected board as a PNG image.

## Development

The project is pure HTML/CSS/JavaScript. To modify the layout or behaviour:

* `index.html` – The page structure and external script/style imports.
* `style.css` – Layout, typography and responsive styles. A CSS variable `--custom-font` is set dynamically to apply uploaded fonts.
* `script.js` – Manages board state, file uploads, live preview updates and export routines. Font files are embedded via a generated `@font-face` rule and applied per‑board using a unique font name.

No build step is required. Simply edit the files and refresh the page to see your changes.

## Reference boards and RAG guidance

The optional local reference server adds a searchable image collection and Gemini-powered design guidance. It retrieves campaign examples, sends up to three selected board images with the current campaign text to Gemini, and returns suggestions with checked reference IDs. Guidance is advisory and never overwrites the editor. Download it with its sources and input snapshot using **Save guidance with sources**.

### Run locally

Requires Python 3.10 or later:

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
cp references.example.json references.local.json
# Edit references.local.json to point to your existing files.
python3 reference_server.py
```

Open http://127.0.0.1:8766/. The existing static editor still works without this server, but reference retrieval needs the server. Keep the server running while using the reference panel. Restart it after changing the collection or configuration.

Configuration:

- `board_dir`: folder of JPG images named `YEAR_CAMPAIGNID_Title.jpg`. Extra copies of a campaign are grouped into one search result. Files outside this naming pattern are skipped; originals are never modified.
- `metadata_csv` (optional): CSV with `id`, `title`, `brand`, `agency`, `campaignUrl`, `highestAward`. IDs must identify the same campaigns as the image filenames.
- `campaign_json` (optional): JSON list with `title`, `year`, `sections`, `ogDesc`, `url`. Descriptions join only on an unambiguous normalized title plus year, because entry IDs may differ from campaign IDs. Ambiguous matches are omitted.
- `source_label`: friendly collection name. `drive_folder_url` is an optional provenance note only; this version reads local files and does not sync Drive.
- `model`: Gemini model ID, default `gemini-3.6-flash`.
- For AI guidance, set `GOOGLE_API_KEY` or `GEMINI_API_KEY` in the server environment. Alternatively, set `credentials_file` to an existing private dotenv file containing one of those variables. Do not paste keys into JSON or client code. A configured key does not guarantee provider access or available quota.

Search uses BM25 keyword ranking across campaign metadata and available descriptions, with additional title and brand weight. It does not perform semantic vector retrieval or OCR across the image collection. Selected images are analysed visually during generation. Missing descriptions are labelled, no-match queries stay empty, and every result exposes its local image and available campaign/description source links. These sources are reference evidence, not verified claims about the user's campaign.

Privacy: the server binds only to loopback, rejects other origins/hosts, and serves an explicit asset allowlist. Private configuration, reference images, metadata and credentials are excluded from Git. Search remains local. Clicking **Get design guidance** sends current board text, the design request and up to three selected reference images/descriptions to Google's Gemini API. This may incur provider charges. Only responses whose cited IDs belong to the selected set are displayed. Citation validation checks provenance IDs, not whether every model interpretation is accurate.

Limits: this is a local prototype, not an authenticated hosted service. The editor and reference selections are held in browser memory; export/save what you need before closing or refreshing. Do not expose this server publicly. The existing layout and export behaviour are unchanged; suggestions do not automatically restyle the board. Corpus files and keys must be configured separately on another computer.

### Verify

```sh
python3 -m unittest discover -s tests -v
```

Tests cover deduplication, metadata provenance, ambiguous joins, ranking, empty results, image bounds, private-file protection, invalid generation requests and rejected citations. They use temporary synthetic data and do not call paid APIs. For a live smoke test, search for a known campaign, inspect its image and source, select it, enter a short sample brief, and request guidance. Check citations and that the editor text stays unchanged. Also confirm ordinary editing, switching boards and exports in your browser.

Provider reference: [Gemini generateContent API](https://ai.google.dev/api/generate-content).
