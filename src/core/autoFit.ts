import type { PartDefinition, PartTransform } from './types';
import { ACCENT_PARTS, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, HOOD_PARTS, MOUTH_PARTS, NOSE_PARTS, OUTFIT_PARTS, SHIRT_PARTS, STRAP_PARTS } from '../data/partLibrary';

type Bounds=PartDefinition['bounds'];
export type AutoFitFamily='eye'|'brow'|'nose'|'mouth';

interface FitOptions {
  scaleBlend:number;
  minScale:number;
  maxScale:number;
  maxTranslate:number;
}

const DEFAULT_FIT:FitOptions={scaleBlend:.72,minScale:.84,maxScale:1.18,maxTranslate:.07};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const center=(bounds:Bounds):readonly[number,number]=>[(bounds.minX+bounds.maxX)/2,(bounds.minY+bounds.maxY)/2];
const width=(bounds:Bounds)=>bounds.maxX-bounds.minX;
const height=(bounds:Bounds)=>bounds.maxY-bounds.minY;

export function fitPartToReference(source:PartDefinition,reference:PartDefinition,options:Partial<FitOptions>={}):PartTransform{
  const config={...DEFAULT_FIT,...options};
  const sourceWidth=width(source.bounds),sourceHeight=height(source.bounds),referenceWidth=width(reference.bounds),referenceHeight=height(reference.bounds);
  if(sourceWidth<=0||sourceHeight<=0||referenceWidth<=0||referenceHeight<=0)return{x:0,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0};
  const rawScaleX=referenceWidth/sourceWidth,rawScaleY=referenceHeight/sourceHeight;
  const scaleX=clamp(1+(rawScaleX-1)*config.scaleBlend,config.minScale,config.maxScale);
  const scaleY=clamp(1+(rawScaleY-1)*config.scaleBlend,config.minScale,config.maxScale);
  const[sourceX,sourceY]=center(source.bounds),[referenceX,referenceY]=center(reference.bounds);
  const x=clamp(referenceX-sourceX*scaleX,-config.maxTranslate,config.maxTranslate);
  const y=clamp(referenceY-sourceY*scaleY,-config.maxTranslate,config.maxTranslate);
  return{x,y,scaleX,scaleY,rotation:0,spacing:0};
}

const makeFits=<T extends string>(parts:Record<T,PartDefinition<T>>,referenceId:T,options:Partial<FitOptions>={}):Record<T,PartTransform>=>{
  const reference=parts[referenceId];
  return Object.fromEntries(Object.entries(parts).map(([id,part])=>[id,fitPartToReference(part as PartDefinition,reference,options)])) as Record<T,PartTransform>;
};

export const EYE_AUTO_FIT=makeFits(EYE_PARTS,'bright',{scaleBlend:.68,minScale:.86,maxScale:1.16,maxTranslate:.055});
export const BROW_AUTO_FIT=makeFits(BROW_PARTS,'soft',{scaleBlend:.64,minScale:.88,maxScale:1.14,maxTranslate:.05});
export const NOSE_AUTO_FIT=makeFits(NOSE_PARTS,'diamond',{scaleBlend:.58,minScale:.86,maxScale:1.16,maxTranslate:.055});
export const MOUTH_AUTO_FIT=makeFits(MOUTH_PARTS,'smile-open',{scaleBlend:.62,minScale:.84,maxScale:1.18,maxTranslate:.06});

export function featureAutoFit(family:AutoFitFamily,id:string):PartTransform{
  if(family==='eye')return EYE_AUTO_FIT[id as keyof typeof EYE_AUTO_FIT];
  if(family==='brow')return BROW_AUTO_FIT[id as keyof typeof BROW_AUTO_FIT];
  if(family==='nose')return NOSE_AUTO_FIT[id as keyof typeof NOSE_AUTO_FIT];
  return MOUTH_AUTO_FIT[id as keyof typeof MOUTH_AUTO_FIT];
}

export const CANONICAL_LAYER_Z:Readonly<Record<string,number>>={
  'skin-base':0,shirt:1,'jacket-underlay':.5,jacket:2,'face-outline':4,face:5,hood:6,strap:7,'strap-metal':8,accent:8,
  'eye-outline':8,'eye-white':9,iris:10,pupil:11,'eye-glint':12,brows:12,nose:12,'mouth-outline':13,'hair-back':14,mouth:14,'mouth-detail':15,'hair-front':15,'hair-accent':16,
};
export const canonicalLayerZ=(layer:string,fallback:number)=>CANONICAL_LAYER_Z[layer]??fallback;

const auditFamilies={
  outfit:OUTFIT_PARTS,hood:HOOD_PARTS,shirt:SHIRT_PARTS,strap:STRAP_PARTS,accent:ACCENT_PARTS,hair:HAIR_PARTS,face:FACE_PARTS,eye:EYE_PARTS,brow:BROW_PARTS,nose:NOSE_PARTS,mouth:MOUTH_PARTS,
} as const;

export interface PartLibraryAudit {
  totalParts:number;
  totalTriangles:number;
  invalidBounds:string[];
  emptyParts:string[];
  nonFiniteTriangles:string[];
  zCorrections:number;
}

export function auditGeneratedPartLibrary():PartLibraryAudit{
  let totalParts=0,totalTriangles=0,zCorrections=0;
  const invalidBounds:string[]=[],emptyParts:string[]=[],nonFiniteTriangles:string[]=[];
  for(const[family,parts]of Object.entries(auditFamilies))for(const part of Object.values(parts) as PartDefinition[]){
    totalParts++;totalTriangles+=part.triangles.length;
    const key=`${family}:${part.id}`;
    const b=part.bounds;
    if(![b.minX,b.minY,b.maxX,b.maxY].every(Number.isFinite)||b.minX>b.maxX||b.minY>b.maxY)invalidBounds.push(key);
    if(part.triangles.length===0)emptyParts.push(key);
    for(const triangle of part.triangles){
      if(!triangle.points.flat().every(Number.isFinite))nonFiniteTriangles.push(key);
      if(canonicalLayerZ(triangle.layer,triangle.zIndex)!==triangle.zIndex)zCorrections++;
    }
  }
  return{totalParts,totalTriangles,invalidBounds,emptyParts,nonFiniteTriangles,zCorrections};
}
