import type { Vec2 } from '../core/types';

export type GeneratedHairRole='hair'|'hairTie';
export type GeneratedEyeRole='pupil'|'white'|'eyes';
export interface GeneratedVariantTriangle<R extends string>{role:R;points:readonly [Vec2,Vec2,Vec2];shade:number}

export const GENERATED_VARIATION_SOURCE={
  kind:'generated-reference-sheet',
  hairCount:10,eyeCount:10,
  hairScale:0.0116,eyeScale:0.0061,
  method:'pixel-segmentation+feature-points+delaunay+contour-hulls',
} as const;

export const GENERATED_HAIR_VARIANTS={
  'ponytail':[],
  'bob':[],
  'side-tail':[],
  'twin-tail':[],
  'braid':[],
  'long':[],
  'wavy':[],
  'short-spike':[],
  'bun':[],
  'half-up':[],
} as const satisfies Record<string,readonly GeneratedVariantTriangle<GeneratedHairRole>[]>;

export const GENERATED_EYE_VARIANTS={
  'bright':[],
  'determined':[],
  'sharp':[],
  'round':[],
  'soft':[],
  'sleepy':[],
  'sparkle':[],
  'closed':[],
  'narrow':[],
  'side-glance':[],
} as const satisfies Record<string,readonly GeneratedVariantTriangle<GeneratedEyeRole>[]>;
