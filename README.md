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