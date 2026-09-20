# RAG toggle evidence — NAP-20260920-AWARDS-RAG-TOGGLE

Time: 2026-09-20 ~01:10 IST.

## Scope (locked)

| Requirement | Evidence |
|---|---|
| UI: RAG ON \| RAG OFF, ADHD-simple, hard to miss | `index.html` fieldset `.rag-toggle` with two large radio options; `studio.css` high-contrast bordered control |
| ON: max THREE Cannes refs via existing BM25 | `design_engine.create_board` slices `corpus.search(...)[:3]` only when `use_rag` |
| Hierarchy/craft only; NEVER place refs as art | Prompt + provenance use flags; Studio refs strip is outside `#board-art` |
| Show ≤3 filenames / small thumbs | Provenance includes `filename` + `thumbnail`; `showRefs()` renders max 3 |
| OFF: zero Cannes retrieval; skills/principles only | `use_rag=False` → `matches=[]`, search not called; writing path same |
| Label exports/drafts RAG-ON vs RAG-OFF | `rag_mode` on draft; badge; export download name suffix |
| CORPUS_PATH env or board_dir in references.local.json | `reference_server.Corpus` resolves `CORPUS_PATH` then `board_dir` |
| README one paragraph | README section "Cannes RAG toggle" |
| No IPA/D&AD layers; no JPG corpus in git | Unchanged; `.gitignore` still excludes private corpus paths |

## Automated proof

```text
$ python3 -m unittest tests.test_rag_toggle -v
test_rag_off_skips_retrieval ... ok
test_rag_on_retrieves_at_most_three ... ok
test_validate_input_accepts_use_rag ... ok
test_writing_rag_off_skips_reference_search ... ok
```

Full suite: 67 existing tests + 4 RAG tests OK.

## Manual A/B recipe

1. Point `CORPUS_PATH` or `board_dir` at the local Cannes JPG folder (not committed).
2. Same brief → Generate with **RAG ON** → note badge `RAG-ON`, ≤3 thumbs, export `*-RAG-ON.png`.
3. Same brief → Generate with **RAG OFF** → badge `RAG-OFF`, empty refs strip, export `*-RAG-OFF.png`.
4. Confirm board art contains only user assets (hero/logo), never Cannes JPEG pixels.

## Files touched (RAG + craft)

- `design_engine.py`, `writing_engine.py`, `reference_server.py`
- `index.html`, `studio.js`, `studio.css`, `typography.js`
- `README.md`, `tests/test_rag_toggle.py`
- `out/NOTES.md`, `out/rag-toggle-evidence.md`
