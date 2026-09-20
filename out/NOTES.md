# Overnight notes — Awards Board Maker

Evidence time: 2026-09-20 ~01:10 IST (Europe/Dublin).
Base commit: `96cc7ab` (skills pack). Work stayed in this clone; no git push.

## Bugs fixed

1. **Cannes retrieval could not be turned off** — `create_board` always BM25-searched and attached up to three reference JPEGs. There was no Studio control, so A/B of the same brief was impossible.
2. **Writing path always retrieved style examples** — `refine_copy` always called corpus search even when the user wanted principles-only craft.
3. **Corpus path was config-only** — `board_dir` in `references.local.json` worked, but `CORPUS_PATH` env override (needed for overnight / laptop path injection) was missing.
4. **Provenance was too thin for review** — matches returned id/source only, so the UI could not show filenames or thumbs for the RAG-ON strip.
5. **Typography craft floor** — body size could sit under a comfortable A2 reading floor; display/body roles were soft. Raised body floor to ~20–21px (board coordinates), strengthened display sizes, and opened section/column rhythm.
6. **Layout craft** — A2 landscape boards needed clearer hierarchy, quieter proof, and less visual clutter. CSS now enforces stronger headline measure, section breathing room, and a quieter results rail.

## Layout and type changes

- Stronger editorial/impact/story display sizes with a hard body floor (no silent body shrink-to-fit).
- Wider section/column gaps; proof rail visually subordinate to the idea.
- Headline measure capped for balance; impact layouts keep a shorter display line.
- Studio typography presets unchanged in name (editorial / modern / condensed / humanist); defaults lean more editorial-clear.

Impeccable Desktop files were unavailable here. Craft followed `skills/awards-board/` (typography + composition-hierarchy) plus README craft rules: editorial clarity, no clutter, strong display/body roles, readable body floor, A2 landscape discipline.

## How to flip the RAG toggle

1. Start Studio: `python3 reference_server.py --port 8766` then open `http://127.0.0.1:8766/`.
2. In the brief panel, use the large **RAG ON | RAG OFF** control (hard to miss).
3. Generate a board.
   - **RAG ON:** at most three Cannes refs via BM25; used for hierarchy/craft only; never placed as art; strip shows ≤3 filenames + small thumbs.
   - **RAG OFF:** zero Cannes retrieval; skills / principles / craft only.
4. Draft badge and export filenames include `RAG-ON` or `RAG-OFF` for A/B.

Corpus: set `CORPUS_PATH` or `board_dir` in ignored `references.local.json` (see `references.example.json`). No JPG corpus in git. No IPA/D&AD layers.

## How to run locally

```sh
cd /workspace/awards-board-maker
python3 -m venv .venv && source .venv/bin/activate
python3 -m pip install -r requirements.txt
cp references.example.json references.local.json
# edit board_dir, or: export CORPUS_PATH=/path/to/cannes/jpgs
python3 reference_server.py --port 8766
```

Verify: `python3 -m unittest discover -s tests -v` and `node --check studio.js typography.js`.

## Paid APIs

No paid provider calls were made for this overnight pass. Layout/type/RAG work is offline. Live Gemini/Runway only runs if keys are already configured when a human generates.
