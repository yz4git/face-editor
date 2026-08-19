import type {
  AccentStyleId, FaceShapeId, HairStyleId, HoodStyleId, OutfitStyleId, PartDefinition, PartTransform, ShirtStyleId, StrapStyleId, Vec2,
} from './types';
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
const IDENTITY:PartTransform={x:0,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const center=(bounds:Bounds):readonly[number,number]=>[(bounds.minX+bounds.maxX)/2,(bounds.minY+bounds.maxY)/2];
const width=(bounds:Bounds)=>bounds.maxX-bounds.minX;
const height=(bounds:Bounds)=>bounds.maxY-bounds.minY;

export function fitPartToReference(source:PartDefinition,reference:PartDefinition,options:Partial<FitOptions>={}):PartTransform{
  const config={...DEFAULT_FIT,...options};
  const sourceWidth=width(source.bounds),sourceHeight=height(source.bounds),referenceWidth=width(reference.bounds),referenceHeight=height(reference.bounds);
  if(sourceWidth<=0||sourceHeight<=0||referenceWidth<=0||referenceHeight<=0)return{...IDENTITY};
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

// Stage 1 hair calibration maps each generated source-sheet cell onto the canonical head.
// Stage 2 below only applies a small robust anchor correction on top of this table.
export const HAIR_SOURCE_FIT:Record<HairStyleId,PartTransform>={
  ponytail:{x:.12865,y:-.03616,scaleX:1.32327,scaleY:1.32325,rotation:0},braid:{x:.06740,y:-.02455,scaleX:.98017,scaleY:1.09094,rotation:0},bob:{x:-.23278,y:-.02590,scaleX:1.02921,scaleY:1.11777,rotation:0},'half-up':{x:-.01840,y:-.02024,scaleX:1.00470,scaleY:1.00468,rotation:0},long:{x:-.05513,y:-.02497,scaleX:1.00468,scaleY:1.10002,rotation:0},bun:{x:0,y:-.02332,scaleX:1.06594,scaleY:1.06596,rotation:0},'short-spike':{x:-.08577,y:-.00980,scaleX:.79640,scaleY:.79638,rotation:0},'side-tail':{x:-.04288,y:-.02479,scaleX:.96792,scaleY:1.09543,rotation:0},wavy:{x:-.11028,y:-.01480,scaleX:.77188,scaleY:.89608,rotation:0},'twin-tail':{x:-.01838,y:-.02592,scaleX:.98018,scaleY:1.11862,rotation:0},
};

export interface AnchorProfile {
  layers?:readonly string[];
  xQuantiles:readonly[number,number];
  yQuantiles:readonly[number,number];
}
export interface AnchorSignature {centerX:number;centerY:number;width:number;height:number;pointCount:number}
interface AnchorFitOptions {
  scaleBlendX:number;
  scaleBlendY:number;
  minScaleX:number;
  maxScaleX:number;
  minScaleY:number;
  maxScaleY:number;
  maxTranslateX:number;
  maxTranslateY:number;
}
const DEFAULT_ANCHOR_FIT:AnchorFitOptions={scaleBlendX:.12,scaleBlendY:.12,minScaleX:.96,maxScaleX:1.04,minScaleY:.96,maxScaleY:1.04,maxTranslateX:.035,maxTranslateY:.035};
const transformPoint=([x,y]:Vec2,t:PartTransform):Vec2=>[x*t.scaleX+t.x,y*t.scaleY+t.y];
const quantile=(values:number[],q:number)=>{if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b),p=clamp(q,0,1)*(sorted.length-1),lo=Math.floor(p),hi=Math.ceil(p),mix=p-lo;return sorted[lo]*(1-mix)+sorted[hi]*mix;};

export function partAnchorSignature(part:PartDefinition,profile:AnchorProfile,preTransform:PartTransform=IDENTITY):AnchorSignature{
  const allowed=profile.layers?new Set(profile.layers):null,points:Vec2[]=[];
  for(const triangle of part.triangles){if(allowed&&!allowed.has(triangle.layer))continue;for(const point of triangle.points)points.push(transformPoint(point,preTransform));}
  if(!points.length)return{centerX:0,centerY:0,width:0,height:0,pointCount:0};
  const xs=points.map(point=>point[0]),ys=points.map(point=>point[1]),minX=quantile(xs,profile.xQuantiles[0]),maxX=quantile(xs,profile.xQuantiles[1]),minY=quantile(ys,profile.yQuantiles[0]),maxY=quantile(ys,profile.yQuantiles[1]);
  return{centerX:(minX+maxX)/2,centerY:(minY+maxY)/2,width:Math.max(0,maxX-minX),height:Math.max(0,maxY-minY),pointCount:points.length};
}

export function fitPartAnchorToReference(source:PartDefinition,reference:PartDefinition,profile:AnchorProfile,options:Partial<AnchorFitOptions>={},sourcePreTransform:PartTransform=IDENTITY,referencePreTransform:PartTransform=IDENTITY):PartTransform{
  const config={...DEFAULT_ANCHOR_FIT,...options},a=partAnchorSignature(source,profile,sourcePreTransform),b=partAnchorSignature(reference,profile,referencePreTransform);
  if(a.pointCount===0||b.pointCount===0||a.width<=0||a.height<=0||b.width<=0||b.height<=0)return{...IDENTITY};
  const rawScaleX=b.width/a.width,rawScaleY=b.height/a.height;
  const scaleX=clamp(1+(rawScaleX-1)*config.scaleBlendX,config.minScaleX,config.maxScaleX),scaleY=clamp(1+(rawScaleY-1)*config.scaleBlendY,config.minScaleY,config.maxScaleY);
  const x=clamp(b.centerX-a.centerX*scaleX,-config.maxTranslateX,config.maxTranslateX),y=clamp(b.centerY-a.centerY*scaleY,-config.maxTranslateY,config.maxTranslateY);
  return{x,y,scaleX,scaleY,rotation:0,spacing:0};
}

const makeAnchorFits=<T extends string>(parts:Record<T,PartDefinition<T>>,referenceId:T,profile:AnchorProfile,options:Partial<AnchorFitOptions>,preTransforms?:Record<T,PartTransform>):Record<T,PartTransform>=>{
  const reference=parts[referenceId],referencePre=preTransforms?.[referenceId]??IDENTITY;
  return Object.fromEntries((Object.entries(parts) as [T,PartDefinition<T>][]).map(([id,part])=>[id,fitPartAnchorToReference(part,reference,profile,options,preTransforms?.[id]??IDENTITY,referencePre)])) as Record<T,PartTransform>;
};

const HAIR_CROWN_ANCHOR:AnchorProfile={layers:['hair-front'],xQuantiles:[.20,.80],yQuantiles:[.52,.88]};
const FACE_CENTER_ANCHOR:AnchorProfile={layers:['face','face-outline'],xQuantiles:[.20,.80],yQuantiles:[.18,.82]};
const JACKET_SHOULDER_ANCHOR:AnchorProfile={layers:['jacket'],xQuantiles:[.18,.82],yQuantiles:[.62,.92]};
const HOOD_NECK_ANCHOR:AnchorProfile={layers:['hood'],xQuantiles:[.16,.84],yQuantiles:[.42,.88]};
const SHIRT_NECK_ANCHOR:AnchorProfile={layers:['shirt'],xQuantiles:[.20,.80],yQuantiles:[.58,.92]};
const STRAP_CHEST_ANCHOR:AnchorProfile={layers:['strap'],xQuantiles:[.18,.82],yQuantiles:[.32,.78]};
const ACCENT_CHEST_ANCHOR:AnchorProfile={layers:['accent'],xQuantiles:[.20,.80],yQuantiles:[.20,.80]};

export const HAIR_PHASE2_AUTO_FIT:Record<HairStyleId,PartTransform>=makeAnchorFits(HAIR_PARTS,'ponytail',HAIR_CROWN_ANCHOR,{scaleBlendX:.10,scaleBlendY:.10,minScaleX:.965,maxScaleX:1.035,minScaleY:.965,maxScaleY:1.035,maxTranslateX:.028,maxTranslateY:.028},HAIR_SOURCE_FIT);
export const FACE_PHASE2_AUTO_FIT:Record<FaceShapeId,PartTransform>=makeAnchorFits(FACE_PARTS,'soft',FACE_CENTER_ANCHOR,{scaleBlendX:.06,scaleBlendY:.08,minScaleX:.975,maxScaleX:1.025,minScaleY:.97,maxScaleY:1.03,maxTranslateX:.022,maxTranslateY:.025});
export const OUTFIT_PHASE2_AUTO_FIT:Record<OutfitStyleId,PartTransform>=makeAnchorFits(OUTFIT_PARTS,'hooded',JACKET_SHOULDER_ANCHOR,{scaleBlendX:.10,scaleBlendY:.08,minScaleX:.97,maxScaleX:1.03,minScaleY:.975,maxScaleY:1.025,maxTranslateX:.03,maxTranslateY:.03});
export const HOOD_PHASE2_AUTO_FIT:Record<HoodStyleId,PartTransform>=makeAnchorFits(HOOD_PARTS,'folded',HOOD_NECK_ANCHOR,{scaleBlendX:.10,scaleBlendY:.10,minScaleX:.97,maxScaleX:1.03,minScaleY:.97,maxScaleY:1.03,maxTranslateX:.028,maxTranslateY:.028});
export const SHIRT_PHASE2_AUTO_FIT:Record<ShirtStyleId,PartTransform>=makeAnchorFits(SHIRT_PARTS,'tee',SHIRT_NECK_ANCHOR,{scaleBlendX:.08,scaleBlendY:.08,minScaleX:.975,maxScaleX:1.025,minScaleY:.975,maxScaleY:1.025,maxTranslateX:.025,maxTranslateY:.025});
export const STRAP_PHASE2_AUTO_FIT:Record<StrapStyleId,PartTransform>=makeAnchorFits(STRAP_PARTS,'simple',STRAP_CHEST_ANCHOR,{scaleBlendX:.04,scaleBlendY:.05,minScaleX:.985,maxScaleX:1.015,minScaleY:.98,maxScaleY:1.02,maxTranslateX:.018,maxTranslateY:.02});
export const ACCENT_PHASE2_AUTO_FIT:Record<AccentStyleId,PartTransform>=makeAnchorFits(ACCENT_PARTS,'diamond',ACCENT_CHEST_ANCHOR,{scaleBlendX:0,scaleBlendY:0,minScaleX:1,maxScaleX:1,minScaleY:1,maxScaleY:1,maxTranslateX:.016,maxTranslateY:.016});

export function composeAxisAlignedTransforms(first:PartTransform,second:PartTransform):PartTransform{
  return{x:first.x*second.scaleX+second.x,y:first.y*second.scaleY+second.y,scaleX:first.scaleX*second.scaleX,scaleY:first.scaleY*second.scaleY,rotation:first.rotation+second.rotation,spacing:(first.spacing??0)+(second.spacing??0)};
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
