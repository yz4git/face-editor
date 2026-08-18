# Face Editor

Three.js / Canvas2D polygon character editor targeting iPhone Safari and ChatGPT Sites.

Generated character parts are stored as triangle-coordinate data; source PNG sheets are authoring inputs only.

## Part Vectorizer v2

Use the vectorizer pipeline under `tools/part-vectorizer-v2` to convert flat source-art sheets into deterministic polygon data and quality-audit artifacts.

## Full-editor auto-fit audit

The generated-source library currently exposes 92 selectable parts. Placement is normalized at runtime with deterministic geometry auto-fit instead of depending on one fixed coordinate system per source sheet. The full audit architecture, pairwise coverage strategy, semantic z-order, reference-anatomy calibration and iPhone landscape checks are documented in [`docs/auto-fit-audit.md`](docs/auto-fit-audit.md).
