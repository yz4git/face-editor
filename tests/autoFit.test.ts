import { describe, expect, it } from 'vitest';
import { auditGeneratedPartLibrary, BROW_AUTO_FIT, CANONICAL_LAYER_Z, EYE_AUTO_FIT, fitPartToReference, MOUTH_AUTO_FIT, NOSE_AUTO_FIT } from '../src/core/autoFit';
import { compileCharacter } from '../src/core/compileCharacter';
import type { CharacterDefinition, PartDefinition, PartTransform } from '../src/core/types';
import { BROW_PARTS, EYE_PARTS, MOUTH_PARTS, NOSE_PARTS } from '../src/data/partLibrary';
import { DEFAULT_CHARACTER } from '../src/data/parts';

type Bounds=PartDefinition['bounds'];
const center=(b:Bounds):readonly[number,number]=>[(b.minX+b.maxX)/2,(b.minY+b.maxY)/2];
const width=(b:Bounds)=>b.maxX-b.minX;
const height=(b:Bounds)=>b.maxY-b.minY;
const transformedBounds=(b:Bounds,t:PartTransform):Bounds=>({minX:b.minX*t.scaleX+t.x,minY:b.minY*t.scaleY+t.y,maxX:b.maxX*t.scaleX+t.x,maxY:b.maxY*t.scaleY+t.y});
const deviation=(source:Bounds,reference:Bounds)=>{const[sx,sy]=center(source),[rx,ry]=center(reference);return Math.abs(sx-rx)+Math.abs(sy-ry)+Math.abs(Math.log(width(source)/width(reference)))+Math.abs(Math.log(height(source)/height(reference)));};

function expectFamilyFit<T extends string>(family:string,parts:Record<T,PartDefinition<T>>,fits:Record<T,PartTransform>,referenceId:T){
  const reference=parts[referenceId];
  expect(fitPartToReference(reference,reference)).toEqual({x:0,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0});
  expect(fits[referenceId]).toEqual({x:0,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0});
  for(const[id,part]of Object.entries(parts) as [T,PartDefinition<T>][]) {
    const fit=fits[id];
    expect([fit.x,fit.y,fit.scaleX,fit.scaleY,fit.rotation,fit.spacing??0].every(Number.isFinite),`${family}:${id}`).toBe(true);
    expect(fit.scaleX,`${family}:${id}`).toBeGreaterThanOrEqual(.84);expect(fit.scaleX,`${family}:${id}`).toBeLessThanOrEqual(1.18);expect(fit.scaleY,`${family}:${id}`).toBeGreaterThanOrEqual(.84);expect(fit.scaleY,`${family}:${id}`).toBeLessThanOrEqual(1.18);
    const before=deviation(part.bounds,reference.bounds),after=deviation(transformedBounds(part.bounds,fit),reference.bounds);expect(after,`${family}:${id}`).toBeLessThanOrEqual(before+1e-9);
  }
}

function expectCompiledVariants<T extends string>(family:string,ids:T[],apply:(character:CharacterDefinition,id:T)=>void){for(const id of ids){const character=structuredClone(DEFAULT_CHARACTER);apply(character,id);const mesh=compileCharacter(character);expect(mesh.layers.length,`${family}:${id}`).toBeGreaterThan(10);expect([mesh.bounds.minX,mesh.bounds.minY,mesh.bounds.maxX,mesh.bounds.maxY].every(Number.isFinite),`${family}:${id}`).toBe(true);for(const layer of mesh.layers)expect(Array.from(layer.positions).every(Number.isFinite),`${family}:${id}:${layer.id}`).toBe(true);}}

describe('generated part auto fitting',()=>{
  it('audits all 122 selectable generated and image-derived parts',()=>{
    const audit=auditGeneratedPartLibrary();
    expect(audit.totalParts).toBe(122);
    expect(audit.totalTriangles).toBe(9073);
    expect(audit.invalidBounds).toEqual([]);expect(audit.emptyParts).toEqual([]);expect(audit.nonFiniteTriangles).toEqual([]);
  });

  it('keeps canonical z ordering deterministic for overlapping semantic layers',()=>{expect(CANONICAL_LAYER_Z.shirt).toBeLessThan(CANONICAL_LAYER_Z.jacket);expect(CANONICAL_LAYER_Z.jacket).toBeLessThan(CANONICAL_LAYER_Z.hood);expect(CANONICAL_LAYER_Z.hood).toBeLessThan(CANONICAL_LAYER_Z.strap);expect(CANONICAL_LAYER_Z['eye-outline']).toBeLessThan(CANONICAL_LAYER_Z.iris);expect(CANONICAL_LAYER_Z.iris).toBeLessThan(CANONICAL_LAYER_Z['eye-glint']);expect(CANONICAL_LAYER_Z['hair-front']).toBeGreaterThan(CANONICAL_LAYER_Z.face);});

  it('keeps each reference feature at identity and moves variants closer to its reference bounds',()=>{expectFamilyFit('eye',EYE_PARTS,EYE_AUTO_FIT,'bright');expectFamilyFit('brow',BROW_PARTS,BROW_AUTO_FIT,'soft');expectFamilyFit('nose',NOSE_PARTS,NOSE_AUTO_FIT,'diamond');expectFamilyFit('mouth',MOUTH_PARTS,MOUTH_AUTO_FIT,'smile-open');});

  it('compiles every auto-fitted facial variant to finite buffers',()=>{expectCompiledVariants('eye',Object.keys(EYE_PARTS) as (keyof typeof EYE_PARTS)[],(character,id)=>{character.eyeStyle=id;});expectCompiledVariants('brow',Object.keys(BROW_PARTS) as (keyof typeof BROW_PARTS)[],(character,id)=>{character.browStyle=id;});expectCompiledVariants('nose',Object.keys(NOSE_PARTS) as (keyof typeof NOSE_PARTS)[],(character,id)=>{character.noseStyle=id;});expectCompiledVariants('mouth',Object.keys(MOUTH_PARTS) as (keyof typeof MOUTH_PARTS)[],(character,id)=>{character.mouthStyle=id;});});

  it('clips the source-sheet triangle accent artifact above the torso',()=>{const character=structuredClone(DEFAULT_CHARACTER);character.accentStyle='triangle';const mesh=compileCharacter(character),accent=mesh.layers.find(layer=>layer.id==='accent');expect(accent).toBeDefined();expect(accent!.positions.length).toBeGreaterThan(0);let maxY=-Infinity;for(let i=1;i<accent!.positions.length;i+=3)maxY=Math.max(maxY,accent!.positions[i]);expect(maxY).toBeLessThanOrEqual(-.28+1e-6);});
});
