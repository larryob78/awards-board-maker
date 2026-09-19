---
name: awards-brand-logo
description: "Place and verify approved brand logos on final awards boards. Use for missing assets, source quality, variants or export clarity; never recreate marks."
metadata:
  pack-version: "1.0"
---

# Brand and logo

## Inputs

Read the [shared contract](../shared/CONTRACT.md). Use approved brand identity, logo asset/variant IDs, original file and permission records, supplied clearspace/minimum-size guidance, background, preserved choices, canvas dimensions, physical/output size, viewing context and actual render/export reports. Missing evidence stays unknown.

## Reasoning

- Every final board requires its approved brand-specific logo. If absent, preserve the draft and request the authorised master. Never invent a mark, reconstruct its lettering, trace it with AI or present sharpening/upscaling as an authentic master. Retain original assets and approved geometry.
- Prefer a genuine clean vector. Inspect content: an SVG wrapper may contain only a tiny bitmap. Otherwise use an adequately resolved PNG, with transparency when needed. Record intrinsic pixel dimensions, vector/raster composition and embedded raster dimensions; extensions cannot prove quality.
- Assess effective resolution at actual placement using intrinsic raster pixels and physical dimensions when relevant; for digital output compare intrinsic pixels with placed export pixels. Declare units and calculations. Do not impose a universal DPI threshold. Vector input still needs an export check: current Studio PNG/PDF output is raster at 7000×4950, so its PDF does not preserve vector sharpness merely because the input was SVG.
- Place the mark deliberately within the hierarchy: align with meaningful content, give it breathing room and balance recognition with the campaign explanation. Preserve aspect ratio, authentic geometry and user choices. Check supplied clearspace/minimum size, background contrast and approved colour/reversed variants. Request missing guidance or a suitable approved variant; do not recolour speculatively.
- Inspect alpha edges, halos, clipping and rendered/exported clarity. A weak source may permit a smaller placement only when brand rules and readability remain satisfied. Otherwise request a better master; do not hide the defect with sharpening or confidently certify unseen pixels.

## Outputs and UI

Return the shared envelope with `logo_inventory`, approval/permission evidence, source inspection, placement proposals, effective-resolution calculations, `logo_checks`, unresolved inputs and `final_quality_blockers`. Bind every check to asset, variant, placement and export version; distinguish synthetic metadata from actual inspection.

Show original/proposed placements with accept/edit/reject, source status and blockers in words. Retain draft saving and recovery. The future application must block final-quality export when the approved logo is absent, fails checks or remains unmeasured. These instructions specify that gate; they do not implement it.

## Quality checks

Verify authentic source, approved variant, geometry, relevant brand rules and actual exported clarity. Unavailable pixels, guidance or measurements remain Not checked, never Pass. If a verified festival rule prohibits a logo, flag the conflict for human resolution and keep that variant non-final.
