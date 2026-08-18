# Part Vectorizer v2

Fast batch pipeline for turning flat character-part sheets into the triangle data used by Face Editor.

## Why v2

The first reference pipeline achieved good results but required repeated manual ROI, seed-color, scale and layer tuning. v2 moves those repeated tasks into one deterministic batch process:

1. crop every declared cell from a part sheet with `sharp`;
2. run VTracer in WebAssembly with polygon + seam-free `cutout` tracing;
3. try a small bounded set of detail/balanced/compact profiles rather than manually retuning parameters;
4. parse the SVG polygons and reject the cell background;
5. infer semantic layers for hair and eyes from Lab color, area and source layout;
6. optionally use explicit `roleColors` when a production palette is known;
7. triangulate polygons with `earcut`;
8. render every candidate back to pixels and score mask IoU, tolerant boundary F1, color error and triangle budget;
9. keep the highest-quality candidate automatically;
10. normalize it directly into Face Editor game coordinates;
11. emit JSON, TypeScript, per-part audits, metrics and a contact sheet.

The source image is an authoring input only. Runtime output is coordinates, roles and shade/color data; no source texture is required by the editor/game.

## Commands

```bash
cd tools/part-vectorizer-v2
npm install

# Highest confidence: 3 bounded trace profiles and automatic best-candidate selection
npm run vectorize -- --manifest ./example.manifest.json

# Quick authoring pass: one balanced profile
npm run vectorize -- --manifest ./example.manifest.json --fast

# Deterministic CI/artifact directory
npm run vectorize -- --manifest ./example.manifest.json --output ./vectorizer-output
```

`--no-fail` still produces geometry and audits if a part misses a quality gate. It is useful while laying out a new sheet; remove it for final asset generation.

## Sheet manifests

A manifest is the only repeatable setup required for a sheet family. It can describe:

- one root `grid`;
- separate `kindGrids` for sections such as a 5×2 hair region and a 5×2 eye region;
- an explicit `rect` for irregular cells;
- shared and per-kind crop insets;
- target game-coordinate bounds;
- automatic role inference settings;
- optional exact palette hints;
- quality thresholds.

Example palette-assisted eye mapping:

```json
{
  "roleHints": {
    "eye": {
      "roleColors": {
        "outline": "#281b18",
        "white": "#fffaf0",
        "eyes": ["#80552f", "#6f4b2c"],
        "pupil": "#211714",
        "highlight": "#ffffff"
      },
      "roleColorTolerance": 24
    }
  }
}
```

If `roleColors` is omitted, hair and eye roles are inferred automatically in Lab color space. This keeps one-off generated sheets low-setup while allowing production art with a known palette to be deterministic.

## Outputs

A run writes:

- `geometry.json` — normalized triangle data;
- `geometry.generated.ts` — application-ready generated constant;
- `metrics.json` — selected profile, every attempted candidate, quality score, timing and triangle counts;
- `audit/<id>.png` — source/vector side-by-side comparison for every part;
- `audit/contact-sheet.png` — one-screen review of the complete batch.

## Quality scoring

Each candidate is rasterized back to its source-cell size. v2 measures:

- semantic foreground mask IoU;
- one-pixel-tolerant boundary F1;
- foreground RGB mean absolute error;
- triangle-budget penalty.

The weighted score selects the best profile. Independent hard gates then reject weak output. This avoids the earlier failure mode where a good whole-mask score could still hide an obviously wrong eye boundary or color layer.

The included synthetic 2-hair + 2-eye end-to-end fixture currently completes the full 3-profile search in a few seconds on a GitHub-hosted runner. That is only a regression benchmark, not a guarantee for arbitrary source size, but it keeps the intended workflow in the seconds/minutes range rather than repeated manual tracing sessions.

## GitHub Actions / iPhone-only workflow

`.github/workflows/part-vectorizer-v2.yml` always runs the fixture tests on changes to this tool. It can also be launched manually with **Run workflow**:

- `manifest_path`: repository-relative manifest for a committed authoring sheet;
- `fast`: use the one-profile quick pass;
- `no_fail`: keep an audit artifact even if final gates fail.

A manual run writes the requested batch to a deterministic artifact directory and uploads it together with the test audit. That means the expensive image processing can run on GitHub rather than on the iPhone.

## Dependencies

- `@visioncortex/vtracer` — official Node/WASM VTracer package; no native VTracer dependency is required;
- `earcut` — fast 2D polygon triangulation;
- `sharp` — fast server-side crop, raster comparison and contact-sheet processing.

The existing OpenCV `scripts/reference-vectorizer.py` remains useful as a specialist fallback for a difficult single part. v2 is the default high-throughput path for batches.
