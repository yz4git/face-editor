# Face Editor Architecture

## 1. Product definition

Face Editor is a 2D character creator inspired by the interaction model of avatar editors such as Mii, but the output is not a bitmap avatar. Every visible character component is authored and compiled as flat triangle data. The same output can therefore be rendered in the editor and consumed directly by a game runtime.

The visual target is a clean 2D anime character assembled from planar polygon pieces. Triangles may use slightly different authored colors to reveal the construction, but there is no light-driven 3D shading and no attempt to model depth.

## 2. Non-negotiable constraints

- Three.js is used as the GPU mesh renderer, not as a 3D modelling layer.
- Character vertices live in a shared 2D XY coordinate system; Z is reserved only for deterministic draw ordering.
- Character art uses `BufferGeometry` + vertex colors + `MeshBasicMaterial`.
- No textures, UVs, normal maps, lights, shadows, perspective camera, or baked sprites are required for the character.
- UI is HTML/CSS. Three.js owns only the character viewport.
- The canonical save is `CharacterDefinition`; the compiled game form is `CompiledPolygonCharacter`.
- Export contains both the editable definition and game-ready typed-buffer equivalents serialized as arrays.
- iPhone Safari landscape is a first-class target.

## 3. Data model

### CharacterDefinition

Small, stable, human-readable save data. It stores selected part IDs, colors, and per-feature transforms. This is what save slots and future network/cloud saves should persist.

```text
CharacterDefinition
  version
  hairStyle
  faceShape
  eyeStyle
  browStyle
  noseStyle
  mouthStyle
  colors
  transforms
```

Part transforms use `(x, y, scaleX, scaleY, rotation)` so future editor sliders can move, scale, squash, widen, and rotate eyes/eyebrows/nose/mouth without changing source mesh definitions.

### CompiledPolygonCharacter

Runtime output. Each layer contains:

```text
id
zIndex
positions: Float32Array  // x,y,z per vertex
colors:    Float32Array  // r,g,b per vertex
indices:   Uint16Array   // triangle index stream
```

The compiler currently expands triangles into independent vertices. This is intentional: each triangle can own its color without forcing adjacent faces to share vertex colors. A later optimizer may merge vertices only when position and color are identical.

### CharacterBundle

Export format for game hand-off:

```text
format: face-editor-polygon-character
formatVersion: 1
definition: CharacterDefinition
mesh:
  bounds
  layers[]
```

This makes exported data usable in two modes: reconstruct from the compact definition when the game's part library is available, or render the exported mesh directly when it is not.

## 4. Triangle-first compiler

`src/core/compileCharacter.ts` is deliberately independent of Three.js. It emits raw typed arrays from simple triangle commands.

The compiler builds layers in this conceptual order:

1. shirt / torso
2. jacket
3. back hair
4. neck
5. face and ears
6. hood
7. strap and clothing accents
8. eye whites
9. irises
10. pupils / highlights
11. brows
12. nose
13. mouth
14. mouth detail
15. front hair

The current implementation is a vertical slice rather than the final art library. Each part already changes the actual mesh data, not only UI state.

## 5. Rendering architecture

`CharacterRenderer` owns:

- one `WebGLRenderer`
- one `Scene`
- one `OrthographicCamera`
- one root `Group`
- one mesh per compiled layer

Materials use vertex colors and disable depth testing/writing. `renderOrder` is driven by `zIndex`. This guarantees predictable 2D composition and avoids accidental depth behavior.

The orthographic camera frames the compiler-reported bounds so the same renderer can later display a face close-up, bust, full body, battle sprite, or dialogue portrait without changing mesh semantics.

## 6. Editor architecture

`EditorApp` owns editor state and HTML controls. It does not know how triangles are rendered. Its responsibilities are:

- select part IDs
- select palette colors
- randomize
- keep an undo history
- maintain local save slots
- request recompilation after a change
- export a character bundle

The UI intentionally remains DOM-based so touch targets, accessibility, safe areas, scrolling panels, and responsive iPhone layout can be handled without a custom WebGL UI framework.

## 7. Part library direction

The first implementation uses procedural geometry in the compiler to prove the pipeline. The next architectural step is to move authored part geometry into declarative `PartDefinition` records.

Target form:

```text
PartDefinition
  id
  category
  anchor
  vertices[]
  triangles[]
  colorRoles[]
  tags[]
  bounds
```

`colorRoles` should refer to semantic palette slots such as `hair.base`, `hair.light`, `skin.base`, `eye.iris`, rather than hard-coded final colors. This allows one authored hairstyle to support every hair color.

## 8. Facial editing model

Mii-like editing will be implemented by transforming feature groups, not by raster resampling. Planned sliders:

- eyes: vertical position, spacing, width, height, angle, overall scale
- brows: vertical position, spacing, width, thickness, angle
- nose: position, width, height
- mouth: position, width, height
- face: width, height, jaw width, chin amount

Transforms are applied before compilation and therefore remain valid game geometry.

## 9. Future animation model

Animation should preserve the same polygon representation.

Phase A: swap meshes for blink / mouth / expression variants.

Phase B: expose named control points and morph selected vertices for blink, mouth open, smile, anger, and brow movement.

Phase C: optional 2D bone hierarchy for head, neck, chest, shoulders, arms, and hair anchors. The bone system must remain independent of perspective or 3D lighting.

## 10. Performance targets

Initial targets for iPhone Safari:

- 60 fps editor interaction on current iPhones.
- DPR capped at 2.
- no per-frame geometry rebuild; recompile only after an edit or animation state change.
- no textures in the core character path.
- no continuous render loop while the editor is idle.
- dispose old geometries/materials immediately after a recompilation.

The current renderer follows these constraints and renders only when state or viewport size changes.

## 11. Test strategy

Pure compiler tests should verify:

- output contains only triangles.
- all position/color/index buffers are internally consistent.
- all character parts remain finite and inside sane bounds.
- changing a selectable feature changes compiled data.
- export is JSON serializable and versioned.

Browser-level tests will later verify touch interaction, responsive layout, WebGL startup/fallback, local save slots, and export behavior.

## 12. Implementation roadmap

### Phase 1 — foundation (current)

- Vite + TypeScript + Three.js project.
- responsive reference-inspired editor UI.
- orthographic flat polygon renderer.
- triangle-first compiler.
- selectable hair/face/eyes/brows/nose/mouth and colors.
- randomize, undo, local save slots, JSON polygon export.
- initial compiler tests and CI.

### Phase 2 — declarative part library

- extract procedural art into `PartDefinition` data.
- build reusable triangle authoring helpers.
- add thumbnail renderer from the same part data.
- expand female and male base libraries.

### Phase 3 — Mii-style transforms

- sliders and touch controls for scale/position/spacing/rotation.
- symmetric editing with optional left/right unlink.
- stronger undo/redo transaction model.

### Phase 4 — face/body system

- separate head, neck, torso and clothing definitions.
- bust/full-body framing modes.
- outfit and accessory slots.

### Phase 5 — expressions and animation

- blink, phoneme mouths, emotion presets.
- vertex morph controls.
- game runtime animation API.

### Phase 6 — production/export

- schema validation and migrations.
- deterministic mesh hashes.
- compact binary format in addition to JSON.
- asset-library version compatibility.
- PWA/offline support and iPhone polish.

## 13. Definition of success

A character created in the editor must be able to enter a game without first being rendered to PNG, SVG, canvas bitmap, or texture atlas. The final avatar is polygon data from creation to gameplay.
