# Face Editor Quality Polish Six-Phase Plan

Branch: `agent/quality-polish-six-phase`
Base: `main` at `d36f9ef0aed5ffbf7499acf94e36bae832c8b8e8`

Durable resume checkpoint for the sequential quality-polish implementation requested on 2026-08-21.

## Phase order

- [ ] 1/6 Accessory Quality Pass v1.1
  - Replace coarse placeholder accessory geometry with denser, silhouette-driven vector geometry.
  - Prioritize Headwear, then Eyewear, Ear Accessory and Face Detail.
  - Preserve all existing accessory IDs and `none` compatibility.

- [ ] 2/6 Hair Modular Quality Pass v1.1
  - Increase quality and segmentation of Back / Extra modular hair geometry.
  - Prevent duplicate-tail / duplicate-bun silhouette conflicts with legacy top presets.
  - Preserve legacy `hairStyle` compatibility.

- [ ] 3/6 Accessory Preview-First UI
  - Split Accessory editor into HEAD / EYES / FACE / EARS tabs.
  - Show only one family at a time with larger visual choices on iPhone.
  - Keep character preview dominant and preserve 44px touch targets.

- [ ] 4/6 Eye/Brow Expression Identity Pass
  - Preserve authored eye and brow identity wherever possible.
  - Use transform deformation first and replacement styles only as fallback.

- [ ] 5/6 Clothing Secondary Color v3
  - Expand clothing palette roles toward PRIMARY / INNER / SECONDARY / HARDWARE / ACCENT.
  - Keep old bundles visually compatible through defaults.

- [ ] 6/6 Face Outline Inspect
  - Add non-destructive face-outline inspection mode that fades hair/head accessories during face-shape editing.
  - Never persist inspection-only visibility state into character data.

## Validation gates

After every phase:
1. Unit tests for the phase
2. TypeScript + production build
3. Relevant browser audit
4. Commit the checkpoint before continuing

Final gate:
- full Chromium regression
- WebKit iPhone landscape
- WebGL runtime
- legacy closed-loop visual audit
- merge to `main` only after all checks are green
