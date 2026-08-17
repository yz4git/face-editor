import type { BrowStyleId, CharacterBaseId, CharacterDefinition, EyeStyleId, FaceShapeId, HairStyleId, MouthStyleId, NoseStyleId } from '../core/types';
import { BODY_PARTS, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, MOUTH_PARTS, NOSE_PARTS } from './partLibrary';

export interface Option<T extends string> { id:T; label:string }
const options=<T extends string>(record:Record<T,{id:T;label:string}>):Option<T>[]=>Object.values(record).map(value=>{const {id,label}=value as {id:T;label:string};return{id,label};});

export const BASE_OPTIONS=options<CharacterBaseId>(BODY_PARTS);
export const HAIR_OPTIONS=options<HairStyleId>(HAIR_PARTS);
export const FACE_OPTIONS=options<FaceShapeId>(FACE_PARTS);
export const EYE_OPTIONS=options<EyeStyleId>(EYE_PARTS);
export const BROW_OPTIONS=options<BrowStyleId>(BROW_PARTS);
export const NOSE_OPTIONS=options<NoseStyleId>(NOSE_PARTS);
export const MOUTH_OPTIONS=options<MouthStyleId>(MOUTH_PARTS);

export const HAIR_COLORS=['#39281d','#4b3021','#6d3c22','#a34b1c','#d77a16','#efaa2e','#2d3540','#1a5c91','#173d70','#6c3f87','#d95c70','#3c884b'];
export const EYE_COLORS=['#5a351b','#145a9b','#3c8732','#5e646a','#6e3d88','#168a91'];
export const SKIN_COLORS=['#ffd0aa','#f6bb8c','#d99b6c','#a96d4a','#70462f'];
export const JACKET_COLORS=['#0b5cad','#2453a4','#166f76','#7a3d8e','#a74343','#3d6d45'];

export const DEFAULT_CHARACTER:CharacterDefinition={
  version:1,
  baseStyle:'female',hairStyle:'ponytail',faceShape:'soft',eyeStyle:'bright',browStyle:'soft',noseStyle:'diamond',mouthStyle:'smile-open',
  colors:{skin:'#ffd0aa',hair:'#39281d',eyes:'#5a351b',brows:'#39281d',jacket:'#0b5cad',accent:'#f1bd42'},
  transforms:{
    eyes:{x:0,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0},
    brows:{x:0,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0},
    nose:{x:0,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0},
    mouth:{x:0,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0},
  },
};

export function normalizeCharacter(input:Partial<CharacterDefinition>|null|undefined):CharacterDefinition{
  const base=structuredClone(DEFAULT_CHARACTER);
  if(!input)return base;
  const out={...base,...input,colors:{...base.colors,...input.colors},transforms:{...base.transforms}} as CharacterDefinition;
  for(const key of ['eyes','brows','nose','mouth'] as const){out.transforms[key]={...base.transforms[key],...(input.transforms?.[key]??{})};}
  if(!out.baseStyle)out.baseStyle='female';
  return out;
}
