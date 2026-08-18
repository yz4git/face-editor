# Face Editor

Three.js / Canvas2D polygon character editor targeting iPhone Safari and ChatGPT Sites.

Generated character parts are stored as triangle-coordinate data; source PNG sheets are authoring inputs only.

## Part Vectorizer v2

Use the vectorizer pipeline under `tools/part-vectorizer-v2` to convert flat source-art sheets into deterministic polygon data and quality-audit artifacts.

## Full-editor auto-fit audit

The generated-source library currently exposes 92 selectable parts. Placement is normalized at runtime with deterministic geometry auto-fit instead of depending on one fixed coordinate system per source sheet. The fitter uses robust source bounds, reference-calibrated facial landmarks, geometry-derived hairstyle seeds and front/back hair depth, plus a sleeve-independent jacket torso core for modular clothes.

The audit then covers every cross-family value pair, rotates through real full-editor screenshots, and checks an iPhone-landscape viewport. See [`docs/auto-fit-audit.md`](docs/auto-fit-audit.md).
