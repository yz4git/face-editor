# Generated source-sheet import — revision 2

This is the production generated-part-sheet workflow used by Face Editor after Part Vectorizer v2 was added. Revision 2 exposes the lower rows of the outfit source sheet as independent selectable modules instead of treating only the first row as complete outfit presets.

## Source set

The authoring source consisted of seven 1448×1086 generated sheets. For deterministic extraction, 724×543 working copies were used. The source image remains authoring-only; Face Editor runtime contains no source texture.

| Sheet | Working-copy SHA-256 | Bytes | Layout |
| --- | --- | ---: | --- |
| `hair.png` | `8a9868deee67c9dc928a18984e200265bf48469bc452bc587f9a701de0fb5752` | 176934 | 5×2 |
| `eyes.png` | `945f090ae66fa074a1f4c5af88b4f96dd4c01a4645efd1653388dce6126f78c9` | 173975 | 5×2 |
| `faces.png` | `d7667d12d1a93da8f20a1ba0da4333836cab72dc662735543ab34c2ea44fc6e8` | 182092 | 5×2 |
| `brows.png` | `614c894a9c9cc2d8e104a61a785f825beb972b4148cc32c03cee33e1b56883cf` | 187194 | 2×5; one brow is mirrored at runtime |
| `noses.png` | `9a5bbf1bef74dc80a42245dd83d337ef755a6cc82509ab5586813119979b9a44` | 188004 | 5×2 |
| `mouths.png` | `a00fa3531632e2f3f40a33c8c931df82e86863e11089112ae911f0dffe431e80` | 180562 | 5×2 |
| `outfits.png` | `ede76806bd5d5c896d64d0ef96a138c8532ee86ba55b3c9688944b914b95ce9f` | 147516 | row 1: 6 jacket silhouettes; row 2: 6 hood/collars; row 3: 6 shirts; row 4: 6 straps/harnesses; row 5: 8 accents |

## Conversion

1. Split each sheet into deterministic cells.
2. Estimate the pale authoring background and build semantic flat-color masks.
3. Classify hair/accent, eye outline/sclera/iris/pupil/highlight, skin/outline, brow, mouth/tongue/outline and outfit jacket/shirt/hood/strap/metal/accent roles.
4. Clean masks with connected-component/morphological filtering.
5. Sample boundary/corner/interior feature points.
6. Delaunay-triangulate each semantic mask and reject triangles with insufficient mask coverage.
7. Store the per-triangle median-source luminance as an additive shade relative to the semantic base color.
8. Calibrate source-cell pixels into canonical Face Editor game coordinates.
9. Pack each triangle as six signed int16 coordinates, one signed int8 shade and one uint8 semantic role.
10. Gzip + base64 the authoring result. Runtime expands only triangle coordinates and semantic roles; it does not load the reference PNGs.

## Runtime composition

The six first-row outfit cells are used as **jacket silhouette/facet presets**. Their embedded hood, shirt and accent pixels are intentionally not emitted by the compiler in revision 2. Instead, the independently traced lower rows are layered on top:

- jacket silhouette: 6 choices
- collar / hood: 6 choices
- inner shirt: 6 choices
- strap / harness: 6 choices
- accent: 8 choices

This changes the outfit system from six fixed looks into composable source-derived parts. For example, a sleeveless jacket can be combined with the wing collar, tank shirt, Y harness and chevron accent without retracing any artwork.

Metal buckle regions in the strap row are classified separately and render with a fixed silver material color while the leather strap remains brown.

## Result

Primary generated pack:

- Hair: 10 variants / 1055 triangles
- Eyes: 10 / 2346
- Face outlines: 10 / 1123
- Brows: 10 / 259
- Noses: 10 / 352
- Mouths: 10 / 594
- Jacket presets: 6 / 852
- Primary total: **66 selectable generated-source parts / 6581 source-derived triangles**

Modular outfit pack:

- Hood / collars: 6 / 320 triangles
- Shirts: 6 / 814
- Straps / harnesses: 6 / 351
- Accents: 8 / 333
- Modular total: **26 selectable generated-source parts / 1818 source-derived triangles**

Combined library:

- **92 selectable generated-source parts**
- **8399 source-derived triangles** across the two deterministic packed datasets

The character compiler adds only small structural underlays (neck skin, hair scalp cap and garment fill) to avoid visual gaps caused by independently generated sheets. The visible feature shapes and facets remain source-derived polygon data.
