import { describe, expect, it } from 'vitest';
import { compileCharacter, getCharacterAutoFitReport } from '../src/core/compileCharacter';
import { DEFAULT_CHARACTER } from '../src/data/parts';
import { ACCENT_PARTS, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, HOOD_PARTS, MOUTH_PARTS, NOSE_PARTS, OUTFIT_PARTS, SHIRT_PARTS, STRAP_PARTS } from '../src/data/partLibrary';
import type { AccentStyleId, BrowStyleId, EyeStyleId, FaceShapeId, HairStyleId, HoodStyleId, MouthStyleId, NoseStyleId, OutfitStyleId, PartDefinition, ShirtStyleId, StrapStyleId } from '../src/core/types';
import { coverageBoundsForPart, fitBoundsToRect, jacketTorsoBounds, LAYER_Z, REFERENCE_ANATOMY_TARGETS } from '../src/core/partAutoFit';

const ids=<T extends string>(record:Record<T,unknown>)=>Object.keys(record) as T[];
const finiteTransform=(value:{x:number;y:number;scaleX:number;scaleY:number;rotation:number})=>[value.x,value.y,value.scaleX,value.scaleY,value.rotation].every(Number.isFinite)&&value.scaleX>0&&value.scaleY>0;
const centerX=(b:{minX:number;maxX:number})=>(b.minX+b.maxX)/2;
const center=(r:readonly[number,number,number,number])=>[(r[0]+r[2])/2,(r[1]+r[3])/2] as const;
const width=(b:{minX:number;maxX:number})=>b.maxX-b.minX;
const hair=ids<HairStyleId>(HAIR_PARTS),faces=ids<FaceShapeId>(FACE_PARTS),eyes=ids<EyeStyleId>(EYE_PARTS),brows=ids<BrowStyleId>(BROW_PARTS),noses=ids<NoseStyleId>(NOSE_PARTS),mouths=ids<MouthStyleId>(MOUTH_PARTS),outfits=ids<OutfitStyleId>(OUTFIT_PARTS),hoods=ids<HoodStyleId>(HOOD_PARTS),shirts=ids<ShirtStyleId>(SHIRT_PARTS),straps=ids<StrapStyleId>(STRAP_PARTS),accents=ids<AccentStyleId>(ACCENT_PARTS);
const rotate=(length:number,index:number,stride:number,offset:number)=>(index*stride+offset)%length;

function combination(index:number){const c=structuredClone(DEFAULT_CHARACTER);c.outfitStyle=outfits[rotate(outfits.length,index,5,0)];c.hoodStyle=hoods[rotate(hoods.length,index,5,1)];c.shirtStyle=shirts[rotate(shirts.length,index,1,2)];c.strapStyle=straps[rotate(straps.length,index,5,3)];c.accentStyle=accents[rotate(accents.length,index,3,1)];c.hairStyle=hair[rotate(hair.length,index,3,0)];c.faceShape=faces[rotate(faces.length,index,7,1)];c.eyeStyle=eyes[rotate(eyes.length,index,9,2)];c.browStyle=brows[rotate(brows.length,index,1,3)];c.noseStyle=noses[rotate(noses.length,index,3,4)];c.mouthStyle=mouths[rotate(mouths.length,index,7,5)];return c;}

describe('92-part deterministic auto-fit',()=>{
  it('covers all 92 parts across twenty rotated full-character combinations',()=>{
    const seen=new Set<string>();for(let i=0;i<20;i++){
      const c=combination(i),report=getCharacterAutoFitReport(c);expect(report.version).toBe(2);expect(report.entries).toHaveLength(13);expect((report.issues??[]).filter(issue=>issue.severity==='error')).toEqual([]);expect(Number.isFinite(report.totalScore??NaN)).toBe(true);
      for(const entry of report.entries){expect(finiteTransform(entry.transform)).toBe(true);expect(Number.isFinite(entry.score)).toBe(true);expect(entry.family==='hair'?entry.score<4:entry.score<.8).toBe(true);seen.add(`${entry.family}:${entry.id.replace(/:(left|right)$/,'')}`);}
      const face=report.entries.find(entry=>entry.family==='face')!,leftEye=report.entries.find(entry=>entry.family==='eye'&&entry.id.endsWith(':left'))!,rightEye=report.entries.find(entry=>entry.family==='eye'&&entry.id.endsWith(':right'))!,leftBrow=report.entries.find(entry=>entry.family==='brow'&&entry.id.endsWith(':left'))!,rightBrow=report.entries.find(entry=>entry.family==='brow'&&entry.id.endsWith(':right'))!,faceCenter=centerX(face.fitted),faceWidth=face.fitted.maxX-face.fitted.minX;expect(Math.abs((centerX(leftEye.fitted)+centerX(rightEye.fitted))/2-faceCenter)).toBeLessThan(faceWidth*.04);expect(Math.abs((centerX(leftBrow.fitted)+centerX(rightBrow.fitted))/2-faceCenter)).toBeLessThan(faceWidth*.04);const mesh=compileCharacter(c);expect([mesh.bounds.minX,mesh.bounds.minY,mesh.bounds.maxX,mesh.bounds.maxY].every(Number.isFinite)).toBe(true);
    }expect(seen.size).toBe(92);
  });

  it('uses the proven reference portrait as the neutral facial landmark calibration',()=>{
    const eye=center(REFERENCE_ANATOMY_TARGETS.eyeLeft),brow=center(REFERENCE_ANATOMY_TARGETS.browLeft),nose=center(REFERENCE_ANATOMY_TARGETS.nose),mouth=center(REFERENCE_ANATOMY_TARGETS.mouth);expect(eye[1]).toBeGreaterThan(.45);expect(eye[1]).toBeLessThan(.50);expect(brow[1]).toBeGreaterThan(.71);expect(brow[1]).toBeLessThan(.75);expect(nose[1]).toBeGreaterThan(.31);expect(nose[1]).toBeLessThan(.34);expect(mouth[1]).toBeGreaterThan(.16);expect(mouth[1]).toBeLessThan(.19);expect(brow[1]).toBeGreaterThan(eye[1]);expect(eye[1]).toBeGreaterThan(nose[1]);expect(nose[1]).toBeGreaterThan(mouth[1]);
  });

  it('derives a sleeve-independent torso core for every jacket silhouette',()=>{
    for(const outfit of outfits){const c=structuredClone(DEFAULT_CHARACTER);c.outfitStyle=outfit;const jacket=getCharacterAutoFitReport(c).entries.find(e=>e.family==='jacket')!,torso=jacketTorsoBounds(OUTFIT_PARTS[outfit],jacket.transform);expect(width(torso)).toBeGreaterThan(width(jacket.fitted)*.35);expect(width(torso)).toBeLessThan(width(jacket.fitted)*.9);expect(centerX(torso)).toBeGreaterThan(jacket.fitted.minX);expect(centerX(torso)).toBeLessThan(jacket.fitted.maxX);}
  });

  it('splits generated hairstyle geometry across front and back anatomical depth',()=>{
    let stylesWithSourceBack=0;for(const style of hair){const c=structuredClone(DEFAULT_CHARACTER);c.hairStyle=style;const mesh=compileCharacter(c),back=mesh.layers.find(layer=>layer.id==='hair-back'),front=mesh.layers.find(layer=>layer.id==='hair-front');expect(front?.indices.length??0).toBeGreaterThan(0);if((back?.indices.length??0)>18)stylesWithSourceBack++;}expect(stylesWithSourceBack).toBeGreaterThanOrEqual(8);
  });

  it('ignores tiny detached tracing fragments when calculating fit bounds',()=>{
    const def:PartDefinition={id:'probe',label:'probe',category:'outfit',anchor:[0,0],bounds:{minX:0,minY:0,maxX:20.01,maxY:20.01},tags:[],triangles:[{points:[[0,0],[1,0],[0,1]],colorRole:'jacket',layer:'jacket',zIndex:1},{points:[[1,0],[1,1],[0,1]],colorRole:'jacket',layer:'jacket',zIndex:1},{points:[[20,20],[20.01,20],[20,20.01]],colorRole:'jacket',layer:'jacket',zIndex:1}]};const robust=coverageBoundsForPart(def,undefined,.995);expect(robust.maxX).toBeLessThanOrEqual(1);expect(robust.maxY).toBeLessThanOrEqual(1);const fit=fitBoundsToRect(robust,{minX:-1,minY:-1,maxX:1,maxY:1});expect(fit.scaleX).toBeGreaterThan(1.9);
  });

  it('uses garment semantics and face anatomy for deterministic z-order',()=>{
    const c=combination(7),mesh=compileCharacter(c),z=Object.fromEntries(mesh.layers.map(layer=>[layer.id,layer.zIndex]));expect(z.shirt).toBe(LAYER_Z.shirt);expect(z.jacket).toBe(LAYER_Z.jacket);expect(z.accent).toBe(LAYER_Z.accent);expect(z.hood).toBe(LAYER_Z.hood);expect(z.strap).toBe(LAYER_Z.strap);expect(z.shirt).toBeLessThan(z.jacket);expect(z.jacket).toBeLessThan(z.accent);expect(z.accent).toBeLessThan(z.hood);expect(z.hood).toBeLessThan(z.strap);expect(z.face).toBeLessThan(z['eye-outline']);expect(z['eye-glint']).toBeLessThan(z.brows);expect(z.brows).toBeLessThan(z['hair-front']);for(let i=1;i<mesh.layers.length;i++)expect(mesh.layers[i].zIndex).toBeGreaterThanOrEqual(mesh.layers[i-1].zIndex);
  });

  it('keeps user Mii-style adjustments as offsets on top of automatic placement',()=>{
    const base=combination(2),edited=structuredClone(base);edited.transforms.eyes.spacing=.08;edited.transforms.eyes.y=.04;edited.transforms.mouth.scaleX=1.25;const before=getCharacterAutoFitReport(base),after=getCharacterAutoFitReport(edited),leftBefore=before.entries.find(e=>e.id.endsWith(':left')&&e.family==='eye')!,leftAfter=after.entries.find(e=>e.id.endsWith(':left')&&e.family==='eye')!;expect(leftAfter.transform.x).toBeLessThan(leftBefore.transform.x);expect(leftAfter.transform.y).toBeGreaterThan(leftBefore.transform.y);expect(leftAfter.score).toBeGreaterThan(leftBefore.score);const mouthBefore=before.entries.find(e=>e.family==='mouth')!,mouthAfter=after.entries.find(e=>e.family==='mouth')!;expect(mouthAfter.transform.scaleX).toBeGreaterThan(mouthBefore.transform.scaleX);expect(mouthAfter.score).toBeGreaterThanOrEqual(mouthBefore.score);
  });
});
