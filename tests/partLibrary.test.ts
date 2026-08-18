import { describe, expect, it } from 'vitest';
import { allPartDefinitions, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, MOUTH_PARTS, NOSE_PARTS, OUTFIT_PARTS } from '../src/data/partLibrary';
import { compileCharacter } from '../src/core/compileCharacter';
import { DEFAULT_CHARACTER } from '../src/data/parts';

describe('declarative part library',()=>{
  it('stores every generated selectable part as finite triangles',()=>{
    const parts=[...Object.values(OUTFIT_PARTS),...Object.values(HAIR_PARTS),...Object.values(FACE_PARTS),...Object.values(EYE_PARTS),...Object.values(BROW_PARTS),...Object.values(NOSE_PARTS),...Object.values(MOUTH_PARTS)];
    expect(parts).toHaveLength(66);
    for(const part of parts){
      expect(part.triangles.length).toBeGreaterThan(0);
      expect(part.tags).toContain('generated-source-sheet');
      for(const tri of part.triangles){expect(tri.points).toHaveLength(3);expect(tri.points.flat().every(Number.isFinite)).toBe(true);}
    }
    expect(allPartDefinitions().length).toBeGreaterThan(parts.length);
  });

  it('applies Mii-style eye spacing and scaling to game mesh data',()=>{
    const a=structuredClone(DEFAULT_CHARACTER),b=structuredClone(DEFAULT_CHARACTER);
    b.transforms.eyes.spacing=.12;b.transforms.eyes.scaleX=1.35;b.transforms.eyes.scaleY=.8;
    const eyePositions=(c:typeof a)=>Array.from(compileCharacter(c).layers.find(l=>l.id==='eye-white')!.positions);
    expect(eyePositions(a)).not.toEqual(eyePositions(b));
  });

  it('changes outfit geometry through the new outfit selector',()=>{
    const a=structuredClone(DEFAULT_CHARACTER),b=structuredClone(DEFAULT_CHARACTER);b.outfitStyle='vest';
    const count=(c:typeof a)=>compileCharacter(c).layers.reduce((sum,l)=>sum+l.indices.length,0);
    expect(count(a)).not.toBe(count(b));
  });
});
