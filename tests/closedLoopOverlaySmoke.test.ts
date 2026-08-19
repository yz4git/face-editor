import { describe,expect,it } from 'vitest';
import { AUTO_REPAIR_GEOMETRY } from '../src/data/generated/autoRepairGeometry';
import { AUTO_REPAIR_OVERRIDES } from '../src/data/generated/autoRepairOverrides';
import { compileCharacter } from '../src/core/compileCharacter';
import { DEFAULT_CHARACTER } from '../src/data/parts';

describe('closed-loop generated overlays',()=>{
  it('start deterministic and within the checked-in generated data layer',()=>{
    expect(Object.keys(AUTO_REPAIR_OVERRIDES)).toEqual([]);
    expect(Object.keys(AUTO_REPAIR_GEOMETRY)).toEqual([]);
  });

  it('keeps normal runtime compilation finite with overlay hooks enabled',()=>{
    const compiled=compileCharacter(structuredClone(DEFAULT_CHARACTER));
    expect(compiled.layers.length).toBeGreaterThan(0);
    expect([compiled.bounds.minX,compiled.bounds.minY,compiled.bounds.maxX,compiled.bounds.maxY].every(Number.isFinite)).toBe(true);
    for(const layer of compiled.layers)expect(Array.from(layer.positions).every(Number.isFinite)).toBe(true);
  });
});
