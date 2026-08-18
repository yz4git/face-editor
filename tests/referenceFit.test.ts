import { describe, expect, it } from 'vitest';
import { compileCharacter } from '../src/core/compileCharacter';
import { DEFAULT_CHARACTER } from '../src/data/parts';
import {
  BROW_PARTS,EYE_PARTS,FACE_PARTS,HAIR_PARTS,MOUTH_PARTS,NOSE_PARTS,OUTFIT_PARTS,
} from '../src/data/partLibrary';
import {
  GENERATED_SOURCE_KEYS,GENERATED_SOURCE_SHEET_META,generatedSourceTriangleCount,
  type GeneratedSourceKind,
} from '../src/data/generatedSourceSheetGeometry';

const splitKey=(key:string):readonly [GeneratedSourceKind,string]=>{
  const index=key.indexOf(':');return[key.slice(0,index) as GeneratedSourceKind,key.slice(index+1)];
};
const generatedFamilies=[HAIR_PARTS,EYE_PARTS,FACE_PARTS,BROW_PARTS,NOSE_PARTS,MOUTH_PARTS,OUTFIT_PARTS] as const;

describe('generated source-sheet polygon geometry',()=>{
  it('keeps the compressed payload/index complete and deterministic',()=>{
    expect(GENERATED_SOURCE_SHEET_META.sourceRevision).toBe(1);
    expect(GENERATED_SOURCE_SHEET_META.triangles).toBe(6581);
    expect(GENERATED_SOURCE_KEYS).toHaveLength(66);
    const decoded=GENERATED_SOURCE_KEYS.reduce((sum,key)=>{const[kind,id]=splitKey(key);return sum+generatedSourceTriangleCount(kind,id);},0);
    expect(decoded).toBe(GENERATED_SOURCE_SHEET_META.triangles);
    expect(generatedSourceTriangleCount('hair','ponytail')).toBe(106);
    expect(generatedSourceTriangleCount('eye','bright')).toBe(217);
    expect(generatedSourceTriangleCount('face','soft')).toBe(116);
    expect(generatedSourceTriangleCount('brow','soft')).toBe(23);
    expect(generatedSourceTriangleCount('nose','diamond')).toBe(36);
    expect(generatedSourceTriangleCount('mouth','smile-open')).toBe(123);
    expect(generatedSourceTriangleCount('outfit','hooded')).toBe(152);
  });

  it('exposes every generated source variant as a selectable editor part',()=>{
    expect(Object.keys(HAIR_PARTS)).toHaveLength(10);
    expect(Object.keys(EYE_PARTS)).toHaveLength(10);
    expect(Object.keys(FACE_PARTS)).toHaveLength(10);
    expect(Object.keys(BROW_PARTS)).toHaveLength(10);
    expect(Object.keys(NOSE_PARTS)).toHaveLength(10);
    expect(Object.keys(MOUTH_PARTS)).toHaveLength(10);
    expect(Object.keys(OUTFIT_PARTS)).toHaveLength(6);
    for(const family of generatedFamilies)for(const part of Object.values(family)){
      expect(part.tags).toContain('generated-source-sheet');
      expect(part.tags).toContain('vectorized-v2');
      expect(part.triangles.length).toBeGreaterThan(0);
      for(const triangle of part.triangles){
        expect(triangle.points).toHaveLength(3);
        expect(triangle.points.flat().every(Number.isFinite)).toBe(true);
        expect(Number.isFinite(triangle.shade??0)).toBe(true);
      }
    }
  });

  it('preserves semantic layers needed by flat-polygon rendering',()=>{
    for(const eye of Object.values(EYE_PARTS)){
      expect(eye.triangles.some(t=>t.layer==='eye-outline')).toBe(true);
      expect(eye.triangles.some(t=>t.layer==='iris')).toBe(true);
      expect(eye.triangles.some(t=>t.layer==='eye-white')).toBe(true);
    }
    for(const face of Object.values(FACE_PARTS))expect(face.triangles.some(t=>t.layer==='face')).toBe(true);
    for(const brow of Object.values(BROW_PARTS))expect(brow.triangles.every(t=>t.layer==='brows')).toBe(true);
    for(const outfit of Object.values(OUTFIT_PARTS))expect(outfit.triangles.some(t=>t.layer==='jacket')).toBe(true);
    expect(MOUTH_PARTS['smile-open'].triangles.some(t=>t.layer==='mouth-detail')).toBe(true);
  });

  it('compiles the generated default character to finite runtime buffers',()=>{
    const mesh=compileCharacter(structuredClone(DEFAULT_CHARACTER));
    expect(mesh.layers.length).toBeGreaterThan(8);
    expect(mesh.bounds.minX).toBeLessThan(mesh.bounds.maxX);
    expect(mesh.bounds.minY).toBeLessThan(mesh.bounds.maxY);
    expect([mesh.bounds.minX,mesh.bounds.minY,mesh.bounds.maxX,mesh.bounds.maxY].every(Number.isFinite)).toBe(true);
    expect(mesh.layers.some(layer=>layer.id==='jacket')).toBe(true);
    expect(mesh.layers.some(layer=>layer.id==='hair-front')).toBe(true);
    expect(mesh.layers.some(layer=>layer.id==='iris')).toBe(true);
  });
});
