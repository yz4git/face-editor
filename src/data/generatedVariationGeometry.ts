import type { EyeStyleId, HairStyleId, Vec2 } from '../core/types';
import { HAIR_RAW_A } from './generated/hairRawA';
import { HAIR_RAW_B } from './generated/hairRawB';
import { EYE_RAW_A } from './generated/eyeRawA';
import { EYE_RAW_B } from './generated/eyeRawB';

export type GeneratedHairRole='hair'|'hairTie';
export type GeneratedEyeRole='outline'|'white'|'eyes'|'pupil'|'glint';
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
const EYE_ROLES:readonly GeneratedEyeRole[]=['outline','white','eyes','pupil','glint'];
const decodeEye=(raw:RawSet):GeneratedVariantTriangle<GeneratedEyeRole>[]=>raw.map(values=>({
  role:EYE_ROLES[values[0]]??'outline',
  shade:values[1],
  points:[point(values,2),point(values,4),point(values,6)],
}));

const hairRaw={...HAIR_RAW_A,...HAIR_RAW_B};
const eyeRaw={...EYE_RAW_A,...EYE_RAW_B};

export const GENERATED_HAIR_VARIANTS=Object.fromEntries(
  Object.entries(hairRaw).map(([id,raw])=>[id,decodeHair(raw)]),
) as Record<HairStyleId,readonly GeneratedVariantTriangle<GeneratedHairRole>[]>;

export const GENERATED_EYE_VARIANTS=Object.fromEntries(
  Object.entries(eyeRaw).map(([id,raw])=>[id,decodeEye(raw)]),
) as Record<EyeStyleId,readonly GeneratedVariantTriangle<GeneratedEyeRole>[]>;
