import { describe, expect, it } from 'vitest';
import { compileCharacter } from '../src/core/compileCharacter';
import { DEFAULT_CHARACTER } from '../src/data/parts';
import { ACCENT_PARTS,BROW_PARTS,EYE_PARTS,FACE_PARTS,HAIR_PARTS,HOOD_PARTS,MOUTH_PARTS,NOSE_PARTS,OUTFIT_PARTS,SHIRT_PARTS,STRAP_PARTS } from '../src/data/partLibrary';
import { GENERATED_SOURCE_KEYS,GENERATED_SOURCE_SHEET_META,generatedSourceTriangleCount,type GeneratedSourceKind } from '../src/data/generatedSourceSheetGeometry';
import { GENERATED_OUTFIT_COMPONENT_KEYS,GENERATED_OUTFIT_COMPONENT_META,generatedOutfitComponentTriangleCount,type OutfitComponentKind } from '../src/data/outfitComponentGeometry';

const splitKey=(key:string):readonly [GeneratedSourceKind,string]=>{const index=key.indexOf(':');return[key.slice(0,index) as GeneratedSourceKind,key.slice(index+1)];};
const splitComponentKey=(key:string):readonly [OutfitComponentKind,string]=>{const index=key.indexOf(':');return[key.slice(0,index) as OutfitComponentKind,key.slice(index+1)];};
const generatedFamilies=[HAIR_PARTS,EYE_PARTS,FACE_PARTS,BROW_PARTS,NOSE_PARTS,MOUTH_PARTS,OUTFIT_PARTS,HOOD_PARTS,SHIRT_PARTS,STRAP_PARTS,ACCENT_PARTS] as const;

describe('generated source-sheet polygon geometry',()=>{
  it('keeps the compressed primary payload/index complete and deterministic',()=>{
    expect(GENERATED_SOURCE_SHEET_META.sourceRevision).toBe(1);expect(GENERATED_SOURCE_SHEET_META.triangles).toBe(6581);expect(GENERATED_SOURCE_SHEET_META.compressedBase64Length).toBe(62860);expect(GENERATED_SOURCE_KEYS).toHaveLength(66);
    const decoded=GENERATED_SOURCE_KEYS.reduce((sum,key)=>{const[kind,id]=splitKey(key);return sum+generatedSourceTriangleCount(kind,id);},0);expect(decoded).toBe(GENERATED_SOURCE_SHEET_META.triangles);
    expect(generatedSourceTriangleCount('hair','ponytail')).toBe(106);expect(generatedSourceTriangleCount('eye','bright')).toBe(217);expect(generatedSourceTriangleCount('face','soft')).toBe(116);expect(generatedSourceTriangleCount('brow','soft')).toBe(23);expect(generatedSourceTriangleCount('nose','diamond')).toBe(36);expect(generatedSourceTriangleCount('mouth','smile-open')).toBe(123);expect(generatedSourceTriangleCount('outfit','hooded')).toBe(152);
  });

  it('keeps the modular outfit payload complete and deterministic',()=>{
    expect(GENERATED_OUTFIT_COMPONENT_META.sourceRevision).toBe(1);
    expect(GENERATED_OUTFIT_COMPONENT_META.triangles).toBe(1818);
    expect(GENERATED_OUTFIT_COMPONENT_META.compressedBase64Length).toBe(18136);
    expect(GENERATED_OUTFIT_COMPONENT_KEYS).toHaveLength(26);
    const decoded=GENERATED_OUTFIT_COMPONENT_KEYS.reduce((sum,key)=>{const[kind,id]=splitComponentKey(key);return sum+generatedOutfitComponentTriangleCount(kind,id);},0);
    expect(decoded).toBe(1818);
    expect(generatedOutfitComponentTriangleCount('hood','folded')).toBe(57);
    expect(generatedOutfitComponentTriangleCount('shirt','long-sleeve')).toBe(148);
    expect(generatedOutfitComponentTriangleCount('strap','single-pouch')).toBe(66);
    expect(generatedOutfitComponentTriangleCount('accent','diamond')).toBe(66);
  });

  it('exposes every generated source variant as a selectable editor part',()=>{
    expect(Object.keys(HAIR_PARTS)).toHaveLength(10);expect(Object.keys(EYE_PARTS)).toHaveLength(10);expect(Object.keys(FACE_PARTS)).toHaveLength(10);expect(Object.keys(BROW_PARTS)).toHaveLength(10);expect(Object.keys(NOSE_PARTS)).toHaveLength(10);expect(Object.keys(MOUTH_PARTS)).toHaveLength(10);expect(Object.keys(OUTFIT_PARTS)).toHaveLength(6);expect(Object.keys(HOOD_PARTS)).toHaveLength(6);expect(Object.keys(SHIRT_PARTS)).toHaveLength(6);expect(Object.keys(STRAP_PARTS)).toHaveLength(6);expect(Object.keys(ACCENT_PARTS)).toHaveLength(8);
    for(const family of generatedFamilies)for(const part of Object.values(family)){expect(part.tags).toContain('generated-source-sheet');expect(part.triangles.length).toBeGreaterThan(0);for(const triangle of part.triangles){expect(triangle.points).toHaveLength(3);expect(triangle.points.flat().every(Number.isFinite)).toBe(true);expect(Number.isFinite(triangle.shade??0)).toBe(true);}}
  });

  it('preserves semantic layers in generated artwork and modular outfit rows',()=>{
    for(const eye of Object.values(EYE_PARTS)){expect(eye.triangles.some(t=>t.layer==='eye-outline')).toBe(true);expect(eye.triangles.some(t=>t.layer==='iris')).toBe(true);}
    expect(Object.values(EYE_PARTS).filter(eye=>eye.triangles.some(t=>t.layer==='eye-white')).length).toBeGreaterThanOrEqual(8);
    expect(Object.values(EYE_PARTS).filter(eye=>eye.triangles.some(t=>t.layer==='eye-glint')).length).toBe(10);
    for(const face of Object.values(FACE_PARTS))expect(face.triangles.some(t=>t.layer==='face')).toBe(true);for(const brow of Object.values(BROW_PARTS))expect(brow.triangles.every(t=>t.layer==='brows')).toBe(true);for(const outfit of Object.values(OUTFIT_PARTS))expect(outfit.triangles.some(t=>t.layer==='jacket')).toBe(true);for(const hood of Object.values(HOOD_PARTS))expect(hood.triangles.every(t=>t.layer==='hood')).toBe(true);for(const shirt of Object.values(SHIRT_PARTS))expect(shirt.triangles.every(t=>t.layer==='shirt')).toBe(true);for(const accent of Object.values(ACCENT_PARTS))expect(accent.triangles.every(t=>t.layer==='accent')).toBe(true);expect(Object.values(STRAP_PARTS).some(strap=>strap.triangles.some(t=>t.layer==='strap-metal'))).toBe(true);expect(MOUTH_PARTS['smile-open'].triangles.some(t=>t.layer==='mouth-detail')).toBe(true);
  });

  it('compiles the generated modular default character to finite runtime buffers',()=>{
    const mesh=compileCharacter(structuredClone(DEFAULT_CHARACTER));expect(mesh.layers.length).toBeGreaterThan(10);expect(mesh.bounds.minX).toBeLessThan(mesh.bounds.maxX);expect(mesh.bounds.minY).toBeLessThan(mesh.bounds.maxY);expect([mesh.bounds.minX,mesh.bounds.minY,mesh.bounds.maxX,mesh.bounds.maxY].every(Number.isFinite)).toBe(true);expect(mesh.layers.some(layer=>layer.id==='jacket')).toBe(true);expect(mesh.layers.some(layer=>layer.id==='jacket-underlay')).toBe(true);expect(mesh.layers.some(layer=>layer.id==='shirt')).toBe(true);expect(mesh.layers.some(layer=>layer.id==='hood')).toBe(true);expect(mesh.layers.some(layer=>layer.id==='strap')).toBe(true);expect(mesh.layers.some(layer=>layer.id==='accent')).toBe(true);expect(mesh.layers.some(layer=>layer.id==='skin-base')).toBe(true);expect(mesh.layers.some(layer=>layer.id==='hair-back')).toBe(true);expect(mesh.layers.some(layer=>layer.id==='hair-front')).toBe(true);expect(mesh.layers.some(layer=>layer.id==='iris')).toBe(true);
  });
});
