import type { EyeStyleId, HairStyleId, Vec2 } from '../core/types';
import { HAIR_RAW_A } from './generated/hairRawA';
import { HAIR_RAW_B } from './generated/hairRawB';
import { EYE_RAW_A } from './generated/eyeRawA';
import { EYE_RAW_B } from './generated/eyeRawB';

export type GeneratedHairRole='hair'|'hairTie';
export type GeneratedEyeRole='outline'|'white'|'eyes'|'pupil'|'highlight';
export interface GeneratedVariantTriangle<R extends string>{role:R;points:readonly [Vec2,Vec2,Vec2];shade:number}
export interface ReferenceBounds{minX:number;minY:number;maxX:number;maxY:number}

export const GENERATED_VARIATION_SOURCE={kind:'generated-reference-sheet',hairCount:10,eyeCount:10,fitRevision:3,method:'sample-sheet segmentation + triangle reconstruction + face-relative hair/eye normalization + painter-layer restoration'} as const;

export const HAIR_REFERENCE_BOUNDS:Record<HairStyleId,ReferenceBounds>={
  ponytail:{minX:-.92,maxX:1.77,minY:-.67,maxY:2.47},bob:{minX:-.82,maxX:1.28,minY:-.33,maxY:2.20},'side-tail':{minX:-.91,maxX:1.59,minY:-1.03,maxY:2.20},'twin-tail':{minX:-1.39,maxX:1.58,minY:-.81,maxY:2.23},braid:{minX:-.88,maxX:1.29,minY:-1.18,maxY:2.23},long:{minX:-.79,maxX:1.48,minY:-.96,maxY:2.21},wavy:{minX:-.93,maxX:1.41,minY:-.63,maxY:2.21},'short-spike':{minX:-.97,maxX:1.13,minY:-.16,maxY:2.69},bun:{minX:-.85,maxX:1.43,minY:-.31,maxY:2.51},'half-up':{minX:-.88,maxX:1.49,minY:-.67,maxY:2.58},
};

export const EYE_REFERENCE_BOUNDS:Record<EyeStyleId,ReferenceBounds>={
  bright:{minX:-.140,maxX:.140,minY:-.175,maxY:.175},determined:{minX:-.154,maxX:.154,minY:-.146,maxY:.146},sharp:{minX:-.164,maxX:.164,minY:-.148,maxY:.148},round:{minX:-.148,maxX:.148,minY:-.162,maxY:.162},soft:{minX:-.162,maxX:.162,minY:-.143,maxY:.143},sleepy:{minX:-.180,maxX:.180,minY:-.114,maxY:.114},sparkle:{minX:-.159,maxX:.159,minY:-.170,maxY:.170},closed:{minX:-.151,maxX:.151,minY:-.045,maxY:.045},narrow:{minX:-.183,maxX:.183,minY:-.106,maxY:.106},'side-glance':{minX:-.154,maxX:.154,minY:-.132,maxY:.132},
};

type RawSet=readonly (readonly number[])[];
const point=(raw:readonly number[],index:number):Vec2=>[raw[index],raw[index+1]];
const decodeHair=(raw:RawSet):GeneratedVariantTriangle<GeneratedHairRole>[]=>raw.map(values=>({role:'hair',shade:values[0],points:[point(values,1),point(values,3),point(values,5)]}));
const decodeEye=(raw:RawSet):GeneratedVariantTriangle<GeneratedEyeRole>[]=>raw.map(values=>{const sourceRole=values[0],shade=values[1],points:[Vec2,Vec2,Vec2]=[point(values,2),point(values,4),point(values,6)];if(sourceRole===0)return{role:'outline',shade,points};if(sourceRole===1)return{role:'white',shade,points};if(sourceRole===2)return{role:'eyes',shade,points};if(sourceRole===3)return{role:'pupil',shade,points};return{role:'highlight',shade:0,points};});
const bounds=(items:readonly GeneratedVariantTriangle<string>[]):ReferenceBounds=>{let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const item of items)for(const[x,y]of item.points){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return{minX,minY,maxX,maxY};};
const fit=(p:Vec2,from:ReferenceBounds,to:ReferenceBounds):Vec2=>{const nx=(p[0]-from.minX)/Math.max(from.maxX-from.minX,.0001),ny=(p[1]-from.minY)/Math.max(from.maxY-from.minY,.0001);return[to.minX+nx*(to.maxX-to.minX),to.minY+ny*(to.maxY-to.minY)];};
const fitEyes=(id:EyeStyleId,items:GeneratedVariantTriangle<GeneratedEyeRole>[]):GeneratedVariantTriangle<GeneratedEyeRole>[]=>{const from=bounds(items),to=EYE_REFERENCE_BOUNDS[id];return items.map(item=>({...item,points:item.points.map(p=>fit(p,from,to)) as unknown as readonly [Vec2,Vec2,Vec2]}));};
const hairRaw={...HAIR_RAW_A,...HAIR_RAW_B},eyeRaw={...EYE_RAW_A,...EYE_RAW_B};
export const GENERATED_HAIR_VARIANTS=Object.fromEntries(Object.entries(hairRaw).map(([id,raw])=>[id,decodeHair(raw)])) as unknown as Record<HairStyleId,readonly GeneratedVariantTriangle<GeneratedHairRole>[]>;
export const GENERATED_EYE_VARIANTS=Object.fromEntries(Object.entries(eyeRaw).map(([id,raw])=>[id,fitEyes(id as EyeStyleId,decodeEye(raw))])) as unknown as Record<EyeStyleId,readonly GeneratedVariantTriangle<GeneratedEyeRole>[]>;
