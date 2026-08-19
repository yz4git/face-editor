# Closed-loop generated part repair

The repair pipeline has two persistent overlay layers so generated source packs remain immutable and easy to roll back:

- `src/data/generated/autoRepairOverrides.ts` stores quality-locked transform corrections.
- `src/data/generated/autoRepairGeometry.ts` stores accepted semantic triangle replacements from selective re-vectorization.

`npm run repair:closed-loop -- --max-passes 3` performs a build and 92-part visual audit, persists only accepted bounded corrections, rebuilds, and repeats until a verified stable pass has no critical anomaly and no newly accepted transform repair.

Safety locks:

- transform candidates still require the visual repair gate (at least 8% and 0.35 points of score improvement);
- persistent cumulative translation is capped at ±0.06 game units;
- persistent cumulative scale is capped to 0.94–1.06;
- a part can receive at most three persistent transform passes;
- repeated generated states abort to prevent oscillation;
- max mutation passes are bounded;
- vector repairs must pass the existing source-space quality gate and optional baseline comparison;
- accepted vector geometry is validated for finite coordinates before persistence;
- the compressed source packs are never rewritten by the repair loop.

For critical geometry repair, pass an authoring manifest and, when available, baseline vectorizer metrics:

```bash
npm run repair:closed-loop -- --max-passes 3 --manifest path/to/sheet.manifest.json --baseline-metrics path/to/metrics.json
```

GitHub Actions pull-request runs validate the closed loop without committing workspace changes. Manual `workflow_dispatch` runs can enable `apply_repairs` to commit only the stable generated overlay files back to the selected branch.
