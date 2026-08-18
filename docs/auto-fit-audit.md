# 92-part full-editor auto-fit audit

This audit treats placement as geometry, not as a list of hand-tuned per-part coordinates.

## Coordinate frames

- **Face frame**: every generated face outline is normalized to the canonical face bounds.
- **Reference anatomy frame**: eyes, brows, nose and mouth use ratios recovered from the previously validated reference portrait. The reference portrait remains calibration data only; runtime rendering still uses generated triangle meshes.
- **Jacket outer frame**: each jacket silhouette is normalized to the canonical garment envelope.
- **Jacket torso frame**: sleeve extremes are removed with vertex quantiles before hood, shirt, strap/harness and accent fitting. This makes the same modular part work on long-sleeve, short-sleeve and vest silhouettes.

## Robust source bounds

Generated source sheets can leave very small detached triangles near a cell edge. Those triangles remain in the render mesh, but fitting uses area-coverage bounds so tiny fragments cannot rescale or move the whole part. Semantic bounds also exclude non-placement details such as eye glints, mouth details and strap metal.

## Hair depth

Each hairstyle is fitted to the current face with an automatically derived geometry seed plus the previous proven calibration as a fallback candidate. After fitting, transformed hair triangles are split by anatomy:

- cap/tails/outside-face geometry -> `hair-back`
- bangs and cheek-length locks overlapping the face -> `hair-front`
- matching accent geometry -> `hair-accent`

This avoids the old all-in-front failure while preserving locks that should cover cheeks.

## Semantic z-order

The compiler resolves source-sheet insertion order into stable semantic layers:

`shirt -> jacket -> garment accent -> hood -> strap/harness -> metal -> hair back -> face -> eyes -> nose/mouth -> brows -> hair front`

## Quality gates

`getCharacterAutoFitReport()` records source bounds, target bounds, fitted bounds and score for every selected part. It also checks:

- fit score limits
- modular garment overlap with the current jacket
- left/right eye symmetry
- left/right brow symmetry
- brows above eyes
- nose below the eye line
- mouth below the nose

The Canvas2D Visual Audit additionally checks non-empty rendering, framing/clipping and full editor screenshots.

## Exhaustive pairwise sweep

`autoFitSweep.ts` deterministically creates character definitions that cover every value-pair across the 11 selectable families. There are 92 selectable parts; the sweep proves all part IDs are seen and that every cross-family pair obligation is covered. Other families are filled with a stable hash so each pair is exercised among varied neighbors.

The browser only loads and runs this sweep when `visualAudit=1`; normal editor sessions do not pay the exhaustive audit cost.

## Artifacts when GitHub Actions is available

The audit writes:

- `autofit-pairwise-sweep.json`
- `autofit-report.json`
- 20 clean character preview screenshots
- 20 full editor screenshots

GitHub Actions is currently failing before checkout with no job steps, so these gates are committed and ready but must not be reported as Actions-passed until a runner actually executes them.
