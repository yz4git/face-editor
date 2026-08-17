import { describe, expect, it } from 'vitest';
import { allPartDefinitions } from '../src/data/partLibrary';
import { compileCharacter } from '../src/core/compileCharacter';
import { DEFAULT_CHARACTER } from '../src/data/parts';

describe('declarative part library',()=>{
  it('stores every selectable part as finite triangles',()=>{
    const parts=allPartDefinitions();
    expect(parts.length).toBeGreaterThan(20);
    for(const part of parts){
      expect(part.triangles.length).toBeGreaterThan(0);
      for(const tri of part.triangles){expect(tri.points).toHaveLength(3);expect(tri.points.flat().every(Number.isFinite)).toBe(true);}
    }
  });

  it('applies Mii-style eye spacing and scaling to game mesh data',()=>{
    const a=structuredClone(DEFAULT_CHARACTER),b=structuredClone(DEFAULT_CHARACTER);
    b.transforms.eyes.spacing=.12;b.transforms.eyes.scaleX=1.35;b.transforms.eyes.scaleY=.8;
    const eyePositions=(c:typeof a)=>Array.from(compileCharacter(c).layers.find(l=>l.id==='eye-white')!.positions);
    expect(eyePositions(a)).not.toEqual(eyePositions(b));
  });
});
