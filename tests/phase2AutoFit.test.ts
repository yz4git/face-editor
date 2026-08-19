import { describe, expect, it } from 'vitest';
import { ACCENT_PHASE2_AUTO_FIT, FACE_PHASE2_AUTO_FIT, HAIR_PHASE2_AUTO_FIT, HOOD_PHASE2_AUTO_FIT, OUTFIT_PHASE2_AUTO_FIT, SHIRT_PHASE2_AUTO_FIT, STRAP_PHASE2_AUTO_FIT, composeAxisAlignedTransforms, HAIR_SOURCE_FIT } from '../src/core/autoFit';
import { compileCharacter } from '../src/core/compileCharacter';
import type { CharacterDefinition, PartTransform } from '../src/core/types';
import { ACCENT_PARTS, FACE_PARTS, HAIR_PARTS, HOOD_PARTS, OUTFIT_PARTS, SHIRT_PARTS, STRAP_PARTS } from '../src/data/partLibrary';
import { DEFAULT_CHARACTER } from '../src/data/parts';

const identity={x:0,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0};
const maps=[HAIR_PHASE2_AUTO_FIT,FACE_PHASE2_AUTO_FIT,OUTFIT_PHASE2_AUTO_FIT,HOOD_PHASE2_AUTO_FIT,SHIRT_PHASE2_AUTO_FIT,STRAP_PHASE2_AUTO_FIT,ACCENT_PHASE2_AUTO_FIT] as const;
function expectSafeTransform(id:string,t:PartTransform){expect([t.x,t.y,t.scaleX,t.scaleY,t.rotation,t.spacing??0].every(Number.isFinite),id).toBe(true);expect(Math.abs(t.x),id).toBeLessThanOrEqual(.04);expect(Math.abs(t.y),id).toBeLessThanOrEqual(.04);expect(t.scaleX,id).toBeGreaterThanOrEqual(.95);expect(t.scaleX,id).toBeLessThanOrEqual(1.05);expect(t.scaleY,id).toBeGreaterThanOrEqual(.95);expect(t.scaleY,id).toBeLessThanOrEqual(1.05);expect(t.rotation,id).toBe(0);}
function compileVariants<T extends string>(family:string,ids:T[],apply:(character:CharacterDefinition,id:T)=>void){for(const id of ids){const character=structuredClone(DEFAULT_CHARACTER);apply(character,id);const mesh=compileCharacter(character);expect(mesh.layers.length,`${family}:${id}`).toBeGreaterThan(10);expect([mesh.bounds.minX,mesh.bounds.minY,mesh.bounds.maxX,mesh.bounds.maxY].every(Number.isFinite),`${family}:${id}`).toBe(true);for(const layer of mesh.layers){expect(Array.from(layer.positions).every(Number.isFinite),`${family}:${id}:${layer.id}`).toBe(true);expect(Array.from(layer.colors).every(Number.isFinite),`${family}:${id}:${layer.id}`).toBe(true);}}}

describe('phase 2 anchor-aware auto fitting',()=>{
  it('keeps reference variants at identity and every correction intentionally small',()=>{
    expect(HAIR_PHASE2_AUTO_FIT.ponytail).toEqual(identity);expect(FACE_PHASE2_AUTO_FIT.soft).toEqual(identity);expect(OUTFIT_PHASE2_AUTO_FIT.hooded).toEqual(identity);expect(HOOD_PHASE2_AUTO_FIT.folded).toEqual(identity);expect(SHIRT_PHASE2_AUTO_FIT.tee).toEqual(identity);expect(STRAP_PHASE2_AUTO_FIT.simple).toEqual(identity);expect(ACCENT_PHASE2_AUTO_FIT.diamond).toEqual(identity);
    for(const map of maps)for(const[id,fit]of Object.entries(map))expectSafeTransform(id,fit);
  });

  it('composes the source-sheet hair calibration with the bounded phase 2 correction',()=>{
    for(const id of Object.keys(HAIR_PARTS) as (keyof typeof HAIR_PARTS)[]){const base=HAIR_SOURCE_FIT[id],correction=HAIR_PHASE2_AUTO_FIT[id],combined=composeAxisAlignedTransforms(base,correction);expect(combined.scaleX).toBeCloseTo(base.scaleX*correction.scaleX,12);expect(combined.scaleY).toBeCloseTo(base.scaleY*correction.scaleY,12);expect(combined.rotation).toBe(0);}
  });

  it('compiles every phase 2 fitted hair, face and outfit-family variant to finite runtime buffers',()=>{
    compileVariants('hair',Object.keys(HAIR_PARTS) as (keyof typeof HAIR_PARTS)[],(c,id)=>{c.hairStyle=id;});
    compileVariants('face',Object.keys(FACE_PARTS) as (keyof typeof FACE_PARTS)[],(c,id)=>{c.faceShape=id;});
    compileVariants('outfit',Object.keys(OUTFIT_PARTS) as (keyof typeof OUTFIT_PARTS)[],(c,id)=>{c.outfitStyle=id;});
    compileVariants('hood',Object.keys(HOOD_PARTS) as (keyof typeof HOOD_PARTS)[],(c,id)=>{c.hoodStyle=id;});
    compileVariants('shirt',Object.keys(SHIRT_PARTS) as (keyof typeof SHIRT_PARTS)[],(c,id)=>{c.shirtStyle=id;});
    compileVariants('strap',Object.keys(STRAP_PARTS) as (keyof typeof STRAP_PARTS)[],(c,id)=>{c.strapStyle=id;});
    compileVariants('accent',Object.keys(ACCENT_PARTS) as (keyof typeof ACCENT_PARTS)[],(c,id)=>{c.accentStyle=id;});
  });
});
