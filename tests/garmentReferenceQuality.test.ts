import { describe,expect,it } from 'vitest';
import { compileCharacter } from '../src/core/compileCharacter';
import { DEFAULT_CHARACTER } from '../src/data/parts';
import { GARMENT_REFERENCE_QUALITY_V1_KEYS,GARMENT_REFERENCE_QUALITY_V1_META,garmentReferenceQualityV1TriangleCount,garmentReferenceQualityV1Triangles } from '../src/data/garmentReferenceQualityV1Geometry';
import type { OutfitStyleId,ShirtStyleId,Vec2 } from '../src/core/types';

const OUTFITS=['blazer','bomber','long-coat','tactical-jacket','cropped-jacket','tech-parka'] as const satisfies readonly OutfitStyleId[];
const SHIRTS=['tee','long-sleeve','tank','turtleneck','henley','dress-shirt'] as const satisfies readonly ShirtStyleId[];
const width=(points:readonly Vec2[])=>Math.max(...points.map(point=>point[0]))-Math.min(...points.map(point=>point[0]));
const partWidth=(id:string)=>width(garmentReferenceQualityV1Triangles('shirt',id).flatMap(triangle=>triangle.points));

describe('Jacket & Inner Quality Pass v1',()=>{
  it('keeps the converted authoring-reference pack deterministic and finite',()=>{
    expect(GARMENT_REFERENCE_QUALITY_V1_META.sourceRevision).toBe(1);
    expect(GARMENT_REFERENCE_QUALITY_V1_META.triangles).toBe(1078);
    expect(GARMENT_REFERENCE_QUALITY_V1_META.compressedBase64Length).toBe(10584);
    expect(GARMENT_REFERENCE_QUALITY_V1_KEYS).toHaveLength(12);
    expect(garmentReferenceQualityV1TriangleCount('outfit','blazer')).toBe(86);
    expect(garmentReferenceQualityV1TriangleCount('outfit','tactical-jacket')).toBe(117);
    expect(garmentReferenceQualityV1TriangleCount('shirt','tee')).toBe(88);
    expect(garmentReferenceQualityV1TriangleCount('shirt','dress-shirt')).toBe(83);
    for(const key of GARMENT_REFERENCE_QUALITY_V1_KEYS){
      const split=key.indexOf(':'),kind=key.slice(0,split) as 'outfit'|'shirt',id=key.slice(split+1),triangles=garmentReferenceQualityV1Triangles(kind,id);
      expect(triangles.length,key).toBeGreaterThanOrEqual(70);
      for(const triangle of triangles){expect(triangle.points.flat().every(Number.isFinite),key).toBe(true);expect(Number.isFinite(triangle.shade),key).toBe(true);expect(triangle.role).toBe(kind==='outfit'?'jacket':'shirt');}
    }
  });

  it('preserves the generated sheet width hierarchy instead of normalizing long sleeves back to tee width',()=>{
    const tee=partWidth('tee'),longSleeve=partWidth('long-sleeve'),turtleneck=partWidth('turtleneck'),tank=partWidth('tank');
    expect(longSleeve/tee).toBeCloseTo(440/381,2);
    expect(turtleneck/tee).toBeCloseTo(442/381,2);
    expect(longSleeve).toBeGreaterThan(tee*1.12);
    expect(turtleneck).toBeGreaterThan(tee*1.12);
    expect(tank).toBeLessThan(tee*.60);
  });

  it('compiles every upgraded jacket and inner through the real editor pipeline',()=>{
    for(const outfitStyle of OUTFITS){
      const character=structuredClone(DEFAULT_CHARACTER);character.outfitStyle=outfitStyle;character.shirtStyle='tee';
      const mesh=compileCharacter(character),jacket=mesh.layers.find(layer=>layer.id==='jacket');
      expect(jacket,`outfit:${outfitStyle}`).toBeDefined();expect(jacket!.indices.length/3,`outfit:${outfitStyle}`).toBeGreaterThanOrEqual(70);expect(Array.from(jacket!.positions).every(Number.isFinite),`outfit:${outfitStyle}`).toBe(true);
    }
    for(const shirtStyle of SHIRTS){
      const character=structuredClone(DEFAULT_CHARACTER);character.outfitStyle='cropped-jacket';character.shirtStyle=shirtStyle;
      const mesh=compileCharacter(character),shirt=mesh.layers.find(layer=>layer.id==='shirt');
      expect(shirt,`shirt:${shirtStyle}`).toBeDefined();expect(shirt!.indices.length/3,`shirt:${shirtStyle}`).toBeGreaterThanOrEqual(70);expect(Array.from(shirt!.positions).every(Number.isFinite),`shirt:${shirtStyle}`).toBe(true);
    }
  });

  it('keeps body-proportion deformation valid for the upgraded garments',()=>{
    for(const bodyProportions of [{height:.78,build:.80,shoulders:.80},{height:1.25,build:1.25,shoulders:1.35}]){
      for(const outfitStyle of OUTFITS){const character=structuredClone(DEFAULT_CHARACTER);character.outfitStyle=outfitStyle;character.bodyProportions=bodyProportions;const mesh=compileCharacter(character);expect(Object.values(mesh.bounds).every(Number.isFinite),outfitStyle).toBe(true);}
      for(const shirtStyle of SHIRTS){const character=structuredClone(DEFAULT_CHARACTER);character.outfitStyle='cropped-jacket';character.shirtStyle=shirtStyle;character.bodyProportions=bodyProportions;const mesh=compileCharacter(character);expect(Object.values(mesh.bounds).every(Number.isFinite),shirtStyle).toBe(true);}
    }
  });
});
