import type { EyeStyleId, HairStyleId, Vec2 } from '../core/types';
import { HAIR_RAW_A } from './generated/hairRawA';
import { HAIR_RAW_B } from './generated/hairRawB';
import { EYE_RAW_A } from './generated/eyeRawA';
import { EYE_RAW_B } from './generated/eyeRawB';

export type GeneratedHairRole='hair'|'hairTie';
export type GeneratedEyeRole='outline'|'white'|'eyes'|'pupil'|'highlight';
export interface GeneratedVariantTriangle<R extends string>{role:R;points:readonly [Vec2,Vec2,Vec2];shade:number}
export interface ReferenceBounds{minX:number;minY:number;maxX:number;maxY:number}

export const GENERATED_VARIATION_SOURCE={
  kind:'generated-reference-sheet',
  hairCount:10,
  eyeCount:10,
  fitRevision:2,
  method:'sample-sheet color segmentation + simplified contours + triangle reconstruction + face-relative alignment',
} as const;

// Measured again from the generated part sheet. Each hairstyle is normalized against
// the visible face width, face-top and chin instead of using the old per-crop frame.
// This makes the extracted silhouette line up with the editor's sampled face geometry.
export const HAIR_REFERENCE_BOUNDS:Record<HairStyleId,ReferenceBounds>={
  ponytail:{minX:-.92,maxX:1.77,minY:-.67,maxY:2.47},
  bob:{minX:-.82,maxX:1.28,minY:-.33,maxY:2.20},
  'side-tail':{minX:-.91,maxX:1.59,minY:-1.03,maxY:2.20},
  'twin-tail':{minX:-1.39,maxX:1.58,minY:-.81,maxY:2.23},
  braid:{minX:-.88,maxX:1.29,minY:-1.18,maxY:2.23},
  long:{minX:-.79,maxX:1.48,minY:-.96,maxY:2.21},
  wavy:{minX:-.93,maxX:1.41,minY:-.63,maxY:2.21},
  'short-spike':{minX:-.97,maxX:1.13,minY:-.16,maxY:2.69},
  bun:{minX:-.85,maxX:1.43,minY:-.31,maxY:2.51},
  'half-up':{minX:-.88,maxX:1.49,minY:-.67,maxY:2.58},
};

type RawSet=readonly (readonly number[])[];
const point=(raw:readonly number[],index:number):Vec2=>[raw[index],raw[index+1]];
const decodeHair=(raw:RawSet):GeneratedVariantTriangle<GeneratedHairRole>[]=>raw.map(values=>({
  role:'hair',
  shade:values[0],
  points:[point(values,1),point(values,3),point(values,5)],
}));

// Raw role codes were produced by the sheet vectorizer in painter order:
// 0 = black outer eye silhouette, 1 = white inset, 2 = colored iris,
// 3 = black pupil, 4 = white highlight. The previous decoder converted role 0
// into artificial edge strips and mapped role 4 to a blown-out iris color; that
// was the main reason the editor eyes no longer resembled the source sheet.
const decodeEye=(raw:RawSet):GeneratedVariantTriangle<GeneratedEyeRole>[]=>raw.map(values=>{
  const sourceRole=values[0],shade=values[1],points:[Vec2,Vec2,Vec2]=[point(values,2),point(values,4),point(values,6)];
  if(sourceRole===0)return{role:'outline',shade,points};
  if(sourceRole===1)return{role:'white',shade,points};
  if(sourceRole===2)return{role:'eyes',shade,points};
  if(sourceRole===3)return{role:'pupil',shade,points};
  return{role:'highlight',shade:0,points};
});

const hairRaw={...HAIR_RAW_A,...HAIR_RAW_B};
const eyeRaw={...EYE_RAW_A,...EYE_RAW_B};

export const GENERATED_HAIR_VARIANTS=Object.fromEntries(
  Object.entries(hairRaw).map(([id,raw])=>[id,decodeHair(raw)]),
) as unknown as Record<HairStyleId,readonly GeneratedVariantTriangle<GeneratedHairRole>[]>;

export const GENERATED_EYE_VARIANTS=Object.fromEntries(
  Object.entries(eyeRaw).map(([id,raw])=>[id,decodeEye(raw)]),
) as unknown as Record<EyeStyleId,readonly GeneratedVariantTriangle<GeneratedEyeRole>[]>;
