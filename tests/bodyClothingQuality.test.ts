import { describe,expect,it } from 'vitest';
import { createBodyProportionMapper,createClothingProportionMapper } from '../src/core/bodyProportions';
import { compileCharacter } from '../src/core/compileCharacter';
import { DEFAULT_CHARACTER } from '../src/data/parts';

const layerPositions=(compiled:ReturnType<typeof compileCharacter>,id:string)=>Array.from(compiled.layers.find(layer=>layer.id===id)?.positions??[]);

describe('Body × Clothing Quality Pass',()=>{
  it('matches normal body geometry at the neutral proportions',()=>{
    const point:[number,number]=[.82,-.9];
    expect(createClothingProportionMapper({height:1,build:1,shoulders:1})(point)).toEqual(createBodyProportionMapper({height:1,build:1,shoulders:1})(point));
  });

  it('softens garment width response at maximum build and shoulders',()=>{
    const point:[number,number]=[.9,-.72],extreme={height:1.25,build:1.25,shoulders:1.35};
    const body=createBodyProportionMapper(extreme)(point),clothing=createClothingProportionMapper(extreme)(point);
    expect(Math.abs(clothing[0])).toBeLessThan(Math.abs(body[0]));
    expect(clothing[1]).toBeCloseTo(body[1],8);
  });

  it('keeps face geometry locked while clothing changes at body extremes',()=>{
    const neutral=structuredClone(DEFAULT_CHARACTER),extreme=structuredClone(DEFAULT_CHARACTER);
    neutral.outfitStyle=extreme.outfitStyle='long-coat';extreme.bodyProportions={height:1.25,build:1.25,shoulders:1.35};
    const a=compileCharacter(neutral),b=compileCharacter(extreme);
    expect(layerPositions(a,'face')).toEqual(layerPositions(b,'face'));
    expect(layerPositions(a,'jacket')).not.toEqual(layerPositions(b,'jacket'));
    for(const value of layerPositions(b,'jacket'))expect(Number.isFinite(value)).toBe(true);
  });
});
