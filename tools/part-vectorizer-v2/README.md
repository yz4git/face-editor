# Part Vectorizer v2 / quality-locked v3 speed path

Fast batch pipeline for turning flat character-part sheets into the triangle data used by Face Editor.

## Why v2

The first reference pipeline achieved good results but required repeated manual ROI, seed-color, scale and layer tuning. v2 moved those repeated tasks into one deterministic batch process:

1. crop every declared cell from a part sheet;
2. run VTracer with polygon + seam-free `cutout` tracing;
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

## Quality-locked v3 acceleration

The default quality mode now keeps the same three trace profiles, raster reconstruction metrics, quality gates and best-candidate selection while removing avoidable work around them:

- the source sheet is decoded to RGBA once, then cells are cropped from memory;
- VTracer candidate jobs run through a persistent `worker_threads` pool, so synchronous WASM tracing can use multiple CPU cores;
- crop pixel buffers are shared with workers through `SharedArrayBuffer` instead of being copied once per profile;
- unchanged parts use a content-addressed incremental cache keyed from source pixels and all vectorization inputs that affect the result;
- GitHub Actions restores/saves the vectorizer cache between eligible workflow runs;
- audit thumbnail resizing is parallelized after candidate selection.

The acceleration path is quality locked by tests: serial and worker-thread runs must emit byte-equivalent geometry objects and identical selected profile, IoU, boundary F1, color MAE, triangle count, shape count and quality score. A second cached run must emit the same geometry and metrics while reporting cache hits.

`metrics.json` includes an `optimization` object with source decode count/time, worker count, available parallelism, cache hits and cache misses.

## Commands

```bash
cd tools/part-vectorizer-v2
npm install

# Highest confidence: 3 bounded trace profiles and automatic best-candidate selection.
# Uses worker threads + incremental cache by default.
npm run vectorize -- --manifest ./example.manifest.json

# Override CPU parallelism when needed.
npm run vectorize -- --manifest ./example.manifest.json --workers 2

# Force a cold quality-locked run without reusing cached candidates.
npm run vectorize -- --manifest ./example.manifest.json --no-cache

# Quick authoring pass: one balanced profile.
npm run vectorize -- --manifest ./example.manifest.json --fast

# Deterministic CI/artifact directory.
npm run vectorize -- --manifest ./example.manifest.json --output ./vectorizer-output
```

`--no-fail` still produces geometry and audits if a part misses a quality gate. It is useful while laying out a new sheet; remove it for final asset generation.

`--fast` intentionally reduces the profile search and therefore is not the quality-locked production mode. Use the default mode when final output quality matters.

## Sheet manifests

A manifest is the only repeatable setup required for a sheet family. It can describe:

- one root `grid`;
- separate `kindGrids` for sections such as a 5×2 hair region and a 5×2 eye region;
- an explicit `rect` for irregular cells;
- shared and per-kind crop insets;
- target game-coordinate bounds;
- automatic role inference settings;
- optional exact palette hints;
- quality thresholds;
- `concurrency`, which is also used as the preferred worker count unless `--workers` overrides it.

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
- `metrics.json` — selected profile, every attempted candidate, quality score, timing, triangle counts and optimization/cache stats;
- `audit/<id>.png` — source/vector side-by-side comparison for every part;
- `audit/contact-sheet.png` — one-screen review of the complete batch.

The local incremental cache lives under `tools/part-vectorizer-v2/.cache/` and is not committed.

## Quality scoring

Each candidate is rasterized back to its source-cell size. v2/v3 measures:

- semantic foreground mask IoU;
- one-pixel-tolerant boundary F1;
- foreground RGB mean absolute error;
- triangle-budget penalty.

The weighted score selects the best profile. Independent hard gates then reject weak output. This avoids the earlier failure mode where a good whole-mask score could still hide an obviously wrong eye boundary or color layer.

## GitHub Actions / iPhone-only workflow

`.github/workflows/part-vectorizer-v2.yml` always runs the fixture tests on changes to this tool. It can also be launched manually with **Run workflow**:

- `manifest_path`: repository-relative manifest for a committed authoring sheet;
- `fast`: use the one-profile quick pass;
- `no_fail`: keep an audit artifact even if final gates fail.

A manual run writes the requested batch to a deterministic artifact directory and uploads it together with the test audit. The `.cache` directory is also restored through GitHub Actions caching, so unchanged cells can skip VTracer across eligible runs. This keeps expensive image processing on GitHub rather than on the iPhone.

## Dependencies

- `@visioncortex/vtracer` — official Node/WASM VTracer package; no native VTracer dependency is required;
- `earcut` — fast 2D polygon triangulation;
- `sharp` — fast server-side crop, raster comparison and contact-sheet processing.

The existing OpenCV `scripts/reference-vectorizer.py` remains useful as a specialist fallback for a difficult single part. The worker/cache path is the default high-throughput production route for batches.
