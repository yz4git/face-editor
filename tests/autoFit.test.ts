import { describe, expect, it } from 'vitest';
import { compileCharacter, getCharacterAutoFitReport } from '../src/core/compileCharacter';
import { DEFAULT_CHARACTER } from '../src/data/parts';
import { ACCENT_PARTS, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, HOOD_PARTS, MOUTH_PARTS, NOSE_PARTS, OUTFIT_PARTS, SHIRT_PARTS, STRAP_PARTS } from '../src/data/partLibrary';
import type { AccentStyleId, BrowStyleId, EyeStyleId, FaceShapeId, HairStyleId, HoodStyleId, MouthStyleId, NoseStyleId, OutfitStyleId, ShirtStyleId, StrapStyleId } from '../src/core/types';
import { LAYER_Z } from '../src/core/partAutoFit';

const ids=<T extends string>(record:Record<T,unknown>)=>Object.keys(record) as T[];
const finiteTransform=(value:{x:number;y:number;scaleX:number;scaleY:number;rotation:number})=>[value.x,value.y,value.scaleX,value.scaleY,value.rotation].every(Number.isFinite)&&value.scaleX>0&&value.scaleY>0;
const centerX=(b:{minX:number;maxX:number})=>(b.minX+b.maxX)/2;

const hair=ids<HairStyleId>(HAIR_PARTS),faces=ids<FaceShapeId>(FACE_PARTS),eyes=ids<EyeStyleId>(EYE_PARTS),brows=ids<BrowStyleId>(BROW_PARTS),noses=ids<NoseStyleId>(NOSE_PARTS),mouths=ids<MouthStyleId>(MOUTH_PARTS);
const outfits=ids<OutfitStyleId>(OUTFIT_PARTS),hoods=ids<HoodStyleId>(HOOD_PARTS),shirts=ids<ShirtStyleId>(SHIRT_PARTS),straps=ids<StrapStyleId>(STRAP_PARTS),accents=ids<AccentStyleId>(ACCENT_PARTS);

function combination(index:number){
  const c=structuredClone(DEFAULT_CHARACTER);
  c.hairStyle=hair[index%hair.length];c.faceShape=faces[index%faces.length];c.eyeStyle=eyes[index%eyes.length];c.browStyle=brows[index%brows.length];c.noseStyle=noses[index%noses.length];c.mouthStyle=mouths[index%mouths.length];
  c.outfitStyle=outfits[index%outfits.length];c.hoodStyle=hoods[index%hoods.length];c.shirtStyle=shirts[index%shirts.length];c.strapStyle=straps[index%straps.length];c.accentStyle=accents[index%accents.length];return c;
}

describe('92-part deterministic auto-fit',()=>{
  it('covers every generated selectable part in ten full-character audit combinations',()=>{
    const seen=new Set<string>();
    for(let i=0;i<10;i++){
      const c=combination(i),report=getCharacterAutoFitReport(c);expect(report.version).toBe(2);expect(report.entries).toHaveLength(13);
      for(const entry of report.entries){expect(finiteTransform(entry.transform)).toBe(true);expect(Number.isFinite(entry.score)).toBe(true);expect(entry.family==='hair'?entry.score<4:entry.score<.8).toBe(true);const id=entry.id.replace(/:(left|right)$/,'');seen.add(`${entry.family}:${id}`);}
      const face=report.entries.find(entry=>entry.family==='face')!,leftEye=report.entries.find(entry=>entry.family==='eye'&&entry.id.endsWith(':left'))!,rightEye=report.entries.find(entry=>entry.family==='eye'&&entry.id.endsWith(':right'))!,leftBrow=report.entries.find(entry=>entry.family==='brow'&&entry.id.endsWith(':left'))!,rightBrow=report.entries.find(entry=>entry.family==='brow'&&entry.id.endsWith(':right'))!,faceCenter=centerX(face.fitted),faceWidth=face.fitted.maxX-face.fitted.minX;
      expect(Math.abs((centerX(leftEye.fitted)+centerX(rightEye.fitted))/2-faceCenter)).toBeLessThan(faceWidth*.04);expect(Math.abs((centerX(leftBrow.fitted)+centerX(rightBrow.fitted))/2-faceCenter)).toBeLessThan(faceWidth*.04);
      const mesh=compileCharacter(c);expect([mesh.bounds.minX,mesh.bounds.minY,mesh.bounds.maxX,mesh.bounds.maxY].every(Number.isFinite)).toBe(true);
    }
    expect(seen.size).toBe(92);
  });

  it('uses a deterministic semantic z-order instead of source-sheet insertion order',()=>{
    const c=combination(7),mesh=compileCharacter(c),z=Object.fromEntries(mesh.layers.map(layer=>[layer.id,layer.zIndex]));
    expect(z.shirt).toBe(LAYER_Z.shirt);expect(z.jacket).toBe(LAYER_Z.jacket);expect(z.hood).toBe(LAYER_Z.hood);expect(z.strap).toBe(LAYER_Z.strap);expect(z.accent).toBe(LAYER_Z.accent);
    expect(z.shirt).toBeLessThan(z.jacket);expect(z.jacket).toBeLessThan(z.hood);expect(z.hood).toBeLessThan(z.strap);expect(z.strap).toBeLessThan(z.accent);expect(z.face).toBeLessThan(z['eye-outline']);expect(z['eye-glint']).toBeLessThan(z.brows);expect(z.brows).toBeLessThan(z['hair-front']);
    for(let i=1;i<mesh.layers.length;i++)expect(mesh.layers[i].zIndex).toBeGreaterThanOrEqual(mesh.layers[i-1].zIndex);
  });

  it('keeps user Mii-style adjustments as offsets on top of automatic placement',()=>{
    const base=combination(2),edited=structuredClone(base);edited.transforms.eyes.spacing=.08;edited.transforms.eyes.y=.04;edited.transforms.mouth.scaleX=1.25;
    const before=getCharacterAutoFitReport(base),after=getCharacterAutoFitReport(edited),leftBefore=before.entries.find(e=>e.id.endsWith(':left')&&e.family==='eye')!,leftAfter=after.entries.find(e=>e.id.endsWith(':left')&&e.family==='eye')!;
    expect(leftAfter.transform.x).toBeLessThan(leftBefore.transform.x);expect(leftAfter.transform.y).toBeGreaterThan(leftBefore.transform.y);expect(leftAfter.score).toBeGreaterThan(leftBefore.score);
    const mouthBefore=before.entries.find(e=>e.family==='mouth')!,mouthAfter=after.entries.find(e=>e.family==='mouth')!;expect(mouthAfter.transform.scaleX).toBeGreaterThan(mouthBefore.transform.scaleX);expect(mouthAfter.score).toBeGreaterThanOrEqual(mouthBefore.score);
  });
});
