import { describe,expect,it } from 'vitest';
import { hairBackTriangles,hairExtraTriangles } from '../src/data/hairModularGeometry';
import { DEFAULT_CHARACTER } from '../src/data/parts';
import { normalizeHairModular,setHairModular } from '../src/core/characterExpansion';

describe('Hair Modular Quality Pass v1.1',()=>{
  it('uses denser back and extra silhouettes',()=>{
    for(const id of ['short','medium','long','wavy'] as const){
      const triangles=hairBackTriangles(id);
      expect(triangles.length,id).toBeGreaterThanOrEqual(12);
      expect(triangles.flatMap(item=>item.points.flat()).every(Number.isFinite)).toBe(true);
    }
    for(const id of ['ponytail','twin-tail','bun','braid'] as const){
      const triangles=hairExtraTriangles(id);
      expect(triangles.length,id).toBeGreaterThanOrEqual(10);
      expect(triangles.flatMap(item=>item.points.flat()).every(Number.isFinite)).toBe(true);
    }
  });

  it('suppresses duplicate top-and-extra silhouettes',()=>{
    for(const [top,extra] of [['ponytail','ponytail'],['side-tail','ponytail'],['twin-tail','twin-tail'],['bun','bun'],['braid','braid']] as const){
      const character=structuredClone(DEFAULT_CHARACTER);character.hairStyle=top;
      setHairModular(character,{back:'long',extra});
      expect(normalizeHairModular(character)).toEqual({back:'long',extra:'none'});
    }
  });

  it('preserves non-conflicting modular combinations',()=>{
    const character=structuredClone(DEFAULT_CHARACTER);character.hairStyle='bob';
    setHairModular(character,{back:'wavy',extra:'braid'});
    expect(normalizeHairModular(character)).toEqual({back:'wavy',extra:'braid'});
  });
});
