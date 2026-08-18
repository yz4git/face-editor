# 92-part full-editor auto-fit audit

This audit treats placement as geometry, not as a list of hand-tuned per-part coordinates.

## Coordinate frames

- **Face frame**: every generated face outline is normalized to the canonical face bounds.
- **Reference anatomy frame**: eyes, brows, nose and mouth use ratios recovered from the previously validated reference portrait. The reference portrait remains calibration data only; runtime rendering still uses generated triangle meshes.
- **Jacket outer frame**: each jacket silhouette is normalized to the canonical garment envelope.
- **Jacket torso frame**: sleeve extremes are removed with vertex quantiles before hood, shirt, strap/harness and accent fitting. This makes the same modular part work on long-sleeve, short-sleeve and vest silhouettes.

## Robust source bounds

Generated source sheets can leave very small detached triangles near a cell edge. Those triangles remain in the render mesh, but fitting uses area-coverage bounds so tiny fragments cannot rescale or move the whole part. Semantic bounds also exclude non-placement details such as eye glints, mouth details and strap metal. Repeated bounds are cached so large audit sweeps do not continually rescan the same dense triangle sets.

## Hair fitting and depth

Each hairstyle receives two candidate seeds: a seed derived automatically from its own central geometry cloud and current face bounds, plus the previous proven calibration when one exists as a safety candidate. A bounded search selects the lower-error placement. Future imported hair styles therefore do not require a new hand-authored seed just to enter the fitting pipeline.

After fitting, transformed hair triangles are split by anatomy: cap/tails/outside-face geometry goes to `hair-back`; bangs and cheek-length locks overlapping the face go to `hair-front`; matching accent geometry goes to `hair-accent`. This avoids the old all-in-front failure while preserving locks that should cover cheeks.

## Reference-anatomy targets

The neutral target positions are derived from the earlier high-fidelity reference portrait rather than arbitrary percentages. In face-relative coordinates the target centers are approximately eye line `y = 0.475`, brow line `y = 0.735`, nose `y = 0.325`, and mouth `y = 0.173`. Individual generated shapes keep their own aspect ratio and are contained inside the corresponding target rectangle.

## Garment fitting

Modular garments are not scaled against sleeve-to-sleeve width. The current jacket's jacket-only mesh first produces an outer frame, then x/y quantiles produce a torso core. Hood, shirt, strap/harness and accent targets are calculated from that torso core. This is especially important for switching between long-sleeve, short-sleeve and vest silhouettes.

## Semantic z-order

The compiler resolves source-sheet insertion order into stable semantic layers:

`shirt -> jacket -> garment accent -> hood -> strap/harness -> metal -> hair back -> face -> eyes -> nose/mouth -> brows -> hair front`

## Quality gates

`getCharacterAutoFitReport()` records source bounds, target bounds, fitted bounds and score for every selected part. It also checks fit score limits, modular garment overlap with the current jacket, left/right eye symmetry, left/right brow symmetry, brows above eyes, nose below the eye line, and mouth below the nose.

The Canvas2D Visual Audit additionally checks non-empty rendering, framing/clipping and full editor screenshots.

## Exhaustive pairwise sweep

`autoFitSweep.ts` deterministically creates character definitions that cover every value-pair across the 11 selectable families. There are 92 selectable parts; the sweep proves all part IDs are seen and that every cross-family pair obligation is covered. Other families are filled with a stable hash so each pair is exercised among varied neighbors. The browser only loads and runs this sweep when `visualAudit=1`; `sweep=0` keeps audit rendering enabled without rerunning the exhaustive sweep.

## Screen audit

After the geometry sweep succeeds, Playwright rotates through 20 full characters with different neighboring parts and stores both character-only and full-editor captures. It then reloads the real editor with `sweep=0` at an iPhone-landscape-sized `844 x 390` viewport and rejects clipping before taking a phone screenshot.

Artifacts when GitHub Actions can execute:

- `autofit-pairwise-sweep.json`
- `autofit-report.json`
- 20 clean character preview screenshots
- 20 full editor screenshots
- `autofit-iphone-landscape.png`

## Validation status rule

GitHub Actions is currently failing before checkout with no job steps. The committed gates are ready, but they must not be described as Actions-passed until a runner actually executes them. The PR stays separate from `main` while this executable validation path is unavailable.
