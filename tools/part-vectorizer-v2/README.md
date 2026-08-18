# Part Vectorizer v2

Fast batch pipeline for turning flat character-part sheets into the triangle data used by Face Editor.

## Why v2

The first reference pipeline achieved good results but required repeated manual ROI, seed-color, scale and layer tuning. v2 moves those repeated tasks into one deterministic batch process:

1. crop every declared cell from a part sheet with `sharp`;
2. run several VTracer polygon profiles (`hierarchical: cutout`) in WebAssembly;
3. parse the resulting SVG polygons and reject the cell background;
4. infer semantic layers for hair and eyes from color, area and containment;
5. triangulate polygons with `earcut`;
6. render every candidate back to pixels and score mask IoU, boundary F1 and color error;
7. keep the highest-quality candidate automatically;
8. normalize it directly into Face Editor game coordinates;
9. emit JSON, TypeScript, per-part audits, metrics and a contact sheet.

The source image is an authoring input only. Runtime output is coordinates, roles and shade/color data; no source texture is required by the editor/game.

## Design goals

- Batch all 10+ parts in one command.
- Prefer deterministic image analysis over hand-authored geometry.
- Use a small profile sweep instead of slow open-ended optimization.
- Fail quality gates instead of silently accepting a bad trace.
- Keep every batch reproducible from a manifest.
- Run completely in GitHub Actions so an iPhone-only workflow is viable.

## Command

```bash
cd tools/part-vectorizer-v2
npm install
npm run vectorize -- --manifest ./example.manifest.json
```

The manifest controls sheet layout, per-kind content insets, semantic role strategy, target game bounds and quality thresholds. See `example.manifest.json`.

## Outputs

A run writes:

- `geometry.json` — normalized triangle data;
- `geometry.generated.ts` — optional application-ready TypeScript;
- `metrics.json` — selected profile, quality score, timing and triangle counts;
- `audit/<id>.png` — source/vector comparison for every part;
- `audit/contact-sheet.png` — one-screen visual review.

## Quality scoring

Each VTracer candidate is rasterized back to the cell size. v2 measures:

- foreground mask IoU;
- one-pixel-tolerant boundary F1;
- foreground RGB mean absolute error;
- triangle-budget penalty.

This avoids the earlier failure mode where a high whole-mask IoU could still hide an obviously wrong iris, pupil or silhouette.

## Dependencies

- `@visioncortex/vtracer` — official Node/WASM VTracer package, polygon tracing and seam-free cutout mode;
- `earcut` — fast 2D polygon triangulation used by WebGL projects including Three.js;
- `sharp` — fast server-side crop/raster/compare/contact-sheet processing.
