# Cutscene Studio v1 — implementation plan

## Goal

Turn the existing single-character editor into a lightweight cutscene authoring tool without baking or mutating CharacterDefinition. Cutscene Studio sits above Body Proportions, Expression System and Character Motion Studio and schedules them over time.

## Product contract

A cutscene is a short sequence (target 4–20 seconds) made of time-addressed cues. Each cue may change expression, pose, action, camera framing and dialogue. The character source data remains unchanged; playback is a reversible preview layer.

## Architecture

Layer order:

1. CharacterDefinition
2. body proportions / fitted part transforms
3. Expression System
4. Motion System
5. Cutscene orchestration (time, cue selection, camera, dialogue)
6. renderer framing / preview overlay

Cutscene Studio never writes pose deformation back into CharacterDefinition.

## v1 data model

- `CutsceneProject` version 1
- duration in milliseconds
- ordered `CutsceneCue[]`
- cue fields: `id`, `timeMs`, `label`, optional expression, pose, action, camera and dialogue
- camera: zoom + normalized pan X/Y
- playback state is UI/runtime state, not authored data

## v1 UX

- top-bar `CUTSCENE` launcher
- preview overlay with title, current dialogue and timecode
- simple horizontal timeline with cue markers
- transport: PLAY/PAUSE, previous cue, next cue, restart
- one-tap templates: INTRO, REACTION, BATTLE
- add cue from current editor state
- delete selected cue
- duration control
- current cue inspector
- iPhone landscape controls keep 44px touch targets

## Playback rules

- cues are sorted by time, stable by id
- expression/pose/action are discrete at cue boundaries
- camera interpolates linearly between neighboring authored camera cues
- dialogue holds until the next dialogue cue; an empty dialogue explicitly clears it
- playback is capped at the existing 30 fps preview budget
- reaching duration pauses at the end
- opening the app does not auto-play

## Persistence

`CharacterBundle` gains optional `cutscene`. Old bundles remain valid. Save slots, JSON export/import and Factory workflows must keep Expression and Motion behavior unchanged.

## Validation

- normalization clamps malformed duration, cue time, camera zoom/pan and text length
- deterministic cue ordering
- camera interpolation tests
- cue-state evaluation tests at boundaries
- bundle round-trip + legacy bundle compatibility
- Playwright timeline playback, dialogue, camera and iPhone touch-size checks
- existing Factory / Expression / Body / Motion / 92-part visual audit must remain green

## Delivery phases

1. Foundation: data model, normalizer/evaluator, default templates, unit tests.
2. Runtime bridge: camera framing API and Cutscene Panel playback controller.
3. Timeline editing: add/delete/reorder/retime cues, current-state capture.
4. Persistence: CharacterBundle, save slots, import/export.
5. Output: cutscene shot sheet and shareable cutscene JSON.
6. iPhone polish: responsive timeline, scrubber, safe-area and performance checks.
7. Regression pass: browser smoke + 92-part closed-loop visual audit.
