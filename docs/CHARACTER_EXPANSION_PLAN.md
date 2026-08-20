# Character Expansion Seven-Phase Plan

Branch: `agent/character-expansion-seven-phase`
Base: `main` at `3d993d9e960efdca968a2671dc656eda93b69bc3`

This file is the durable resume checkpoint for the continuous implementation requested on 2026-08-20. Every phase is committed independently and the final head is validated as one integrated system.

## Phase order

- [x] 1/7 Minimal Layer Pack
  - Added non-destructive shirt-only, hood off, strap off and accent off states without replacing existing style IDs.
  - Legacy bundles normalize to the previous fully-layered appearance.
  - OUTFIT UI controls survive Save/Load/Export.

- [x] 2/7 Clothing Color System v2
  - Added independent inner-shirt, trim/collar and accent colors.
  - Existing bundles preserve their previous appearance through backward-compatible defaults.
  - iPhone editing UI exposes the new clothing color roles.

- [x] 3/7 Body × Clothing Quality Pass
  - Added softened/non-linear clothing response to extreme build and shoulder values.
  - Normal-body appearance remains stable while maximum-body clothing avoids excessive lateral expansion.
  - Added extreme-body clothing regression coverage.

- [x] 4/7 Face Shape Quality Pass v2
  - Increased separation between all 10 existing face-shape IDs using cheek, jaw, chin and vertical-ratio profiles.
  - Existing IDs and save compatibility are preserved.

- [x] 5/7 Expression / Mouth Quality Pass
  - Expressions preserve the selected mouth identity where possible instead of always replacing it.
  - Surprise/happy mouth deformation is capped for petite/rounder faces.
  - Added expression-mouth regression tests.

- [x] 6/7 Hair Modular v1
  - Preserved legacy `hairStyle` as the front/top compatibility preset.
  - Added independent back-hair and extra-hair silhouette controls.
  - Factory generation supports modular combinations while keeping lock behavior and old saves compatible.

- [x] 7/7 Accessory Pack v1
  - Added Headwear, Eyewear, Face Detail and Ear Accessory categories.
  - Every category includes `none` and uses non-destructive triangle layers.
  - Integrated editor UI, Factory, Save/Load/Export, Motion/Cutscene and iPhone landscape layout.

## Final integrated validation

Final validated implementation head before this checkpoint update: `f1f2ed138212a2619c01a113c17f64bc04064d81`.

- Face Editor CI #320: success
  - 26/26 test files
  - 105/105 tests
  - TypeScript success
  - Vite production build success
  - Sites worker build success
  - root install: 0 vulnerabilities
- Character Factory Smoke #109: success
  - Chromium full regression success
  - WebGL runtime covered by the browser regression suite
  - WebKit iPhone landscape success
  - WebKit flow includes Minimal Layer, clothing colors, Hair Modular, all four Accessory categories, Save → mutate → Load restore, SOLO, Motion + Expression and Cutscene
- Face Editor Visual Audit #281: success
  - stable: true
  - passes: 1
  - mutationPasses: 0
  - transformRepairs: []
  - geometryRepairs: []
  - no generated repair commit required

## Resume state

All seven requested phases are implemented. The remaining release action is to keep this checkpoint document in sync, make PR #31 ready for review, confirm the checkpoint-only commit does not regress CI, and merge to `main` when green.
