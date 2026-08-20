# Character Expansion Seven-Phase Plan

Branch: `agent/character-expansion-seven-phase`
Base: `main` at `3d993d9e960efdca968a2671dc656eda93b69bc3`

This file is the durable resume checkpoint for the continuous implementation requested on 2026-08-20. Each completed phase is committed independently before the next phase starts.

## Phase order

- [ ] 1/7 Minimal Layer Pack
  - Add `none`/minimal options for hood, strap, accent, and shirt-only outerwear.
  - Preserve legacy bundles by defaulting missing values to previous defaults.
  - Update Randomize and Factory weighting so minimal looks occur naturally.

- [ ] 2/7 Clothing Color System v2
  - Expose accent color.
  - Add independent inner-shirt color and secondary/trim color roles with backward-compatible defaults.
  - Keep old bundles valid.

- [ ] 3/7 Body × Clothing Quality Pass
  - Use softened/non-linear clothing response to extreme shoulders/build.
  - Preserve face/head proportions and old normal-body appearance.
  - Add extreme-body clothing regression coverage.

- [ ] 4/7 Face Shape Quality Pass v2
  - Increase jaw/chin/cheek/vertical-ratio separation between the 10 existing face shapes.
  - Keep current IDs/save compatibility.

- [ ] 5/7 Expression / Mouth Quality Pass
  - Make expression mouth changes preserve selected mouth identity better.
  - Limit oversized surprise/open-mouth deformation on petite faces.

- [ ] 6/7 Hair Modular v1
  - Add modular front/back/extra hair controls while preserving legacy `hairStyle` as a compatibility preset.
  - Ensure Factory can generate modular combinations without visual explosion.

- [ ] 7/7 Accessory Pack v1
  - Add Headwear, Eyewear, Face Detail, Ear Accessory categories.
  - Every category includes `none` and uses non-destructive triangle layers.
  - Integrate UI, Factory, save/load/export, Motion/Cutscene and iPhone layout.

## Validation gates

After every phase:
1. `npm test`
2. TypeScript + production build
3. Relevant browser audit if the phase affects layout/rendering
4. Commit the checkpoint before moving on

Final gate:
- full Chromium regression
- WebKit iPhone landscape
- WebGL runtime
- legacy closed-loop visual audit
- PR review summary and merge to `main` only when all gates are green
