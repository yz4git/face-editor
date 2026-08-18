import type { EyeStyleId, HairStyleId, Vec2 } from '../core/types';
import { HAIR_RAW_A } from './generated/hairRawA';
import { HAIR_RAW_B } from './generated/hairRawB';
import { EYE_RAW_A } from './generated/eyeRawA';
import { EYE_RAW_B } from './generated/eyeRawB';

export type GeneratedHairRole='hair'|'hairTie';
export type GeneratedEyeRole='pupil'|'white'|'eyes';
export interface GeneratedVariantTriangle<R extends string>{role:R;points:readonly [Vec2,Vec2,Vec2];shade:number}

export const GENERATED_VARIATION_SOURCE={
  kind:'generated-reference-sheet',
  hairCount:10,
  eyeCount:10,
  method:'sample-sheet color segmentation + simplified contours + triangle reconstruction',
} as const;

type RawSet=readonly (readonly number[])[];
const point=(raw:readonly number[],index:number):Vec2=>[raw[index],raw[index+1]];
const decodeHair=(raw:RawSet):GeneratedVariantTriangle<GeneratedHairRole>[]=>raw.map(values=>({
  role:'hair',
  shade:values[0],
  points:[point(values,1),point(values,3),point(values,5)],
}));
const inset=(center:Vec2,p:Vec2,factor=.82):Vec2=>[center[0]+(p[0]-center[0])*factor,center[1]+(p[1]-center[1])*factor];
const decodeEye=(raw:RawSet):GeneratedVariantTriangle<GeneratedEyeRole>[]=>raw.flatMap(values=>{
  const sourceRole=values[0],shade=values[1],a=point(values,2),b=point(values,4),c=point(values,6);
  if(sourceRole===0){
    const ib=inset(a,b),ic=inset(a,c);
    return[
      {role:'pupil' as const,shade:0,points:[b,c,ic] as const},
      {role:'pupil' as const,shade:0,points:[b,ic,ib] as const},
    ];
  }
  if(sourceRole===1)return[{role:'white' as const,shade,points:[a,b,c] as const}];
  if(sourceRole===2)return[{role:'eyes' as const,shade,points:[a,b,c] as const}];
  if(sourceRole===3)return[{role:'pupil' as const,shade,points:[a,b,c] as const}];
  return[{role:'eyes' as const,shade:220,points:[a,b,c] as const}];
});

const hairRaw={...HAIR_RAW_A,...HAIR_RAW_B};
const eyeRaw={...EYE_RAW_A,...EYE_RAW_B};

export const GENERATED_HAIR_VARIANTS=Object.fromEntries(
  Object.entries(hairRaw).map(([id,raw])=>[id,decodeHair(raw)]),
) as Record<HairStyleId,readonly GeneratedVariantTriangle<GeneratedHairRole>[]>;

export const GENERATED_EYE_VARIANTS=Object.fromEntries(
  Object.entries(eyeRaw).map(([id,raw])=>[id,decodeEye(raw)]),
) as Record<EyeStyleId,readonly GeneratedVariantTriangle<GeneratedEyeRole>[]>;
