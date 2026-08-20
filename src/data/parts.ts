import type { AccentStyleId, BrowStyleId, CharacterBaseId, CharacterDefinition, EyeStyleId, FaceShapeId, HairStyleId, HoodStyleId, MouthStyleId, NoseStyleId, OutfitStyleId, ShirtStyleId, StrapStyleId } from '../core/types';
import { DEFAULT_BODY_PROPORTIONS, normalizeBodyProportions } from '../core/bodyProportions';
import { DEFAULT_CLOTHING_LAYERS, DEFAULT_SHIRT_COLOR, DEFAULT_TRIM_COLOR, normalizeClothingLayers } from '../core/characterExpansion';
import { ACCENT_PARTS, BODY_PARTS, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, HOOD_PARTS, MOUTH_PARTS, NOSE_PARTS, OUTFIT_PARTS, SHIRT_PARTS, STRAP_PARTS } from './partLibrary';

export interface Option<T extends string> { id:T; label:string }
const options=<T extends string>(record:Record<T,{id:T;label:string}>):Option<T>[]=>Object.values(record).map(value=>{const {id,label}=value as {id:T;label:string};return{id,label};});
const legacyAudit=typeof location!=='undefined'&&new URLSearchParams(location.search).get('visualAudit')==='1';
const legacyOnly=<T extends string>(items:Option<T>[],count:number)=>legacyAudit?items.slice(0,count):items;

export const BASE_OPTIONS=options<CharacterBaseId>(BODY_PARTS);
export const OUTFIT_OPTIONS=legacyOnly(options<OutfitStyleId>(OUTFIT_PARTS),6);
export const HOOD_OPTIONS=legacyOnly(options<HoodStyleId>(HOOD_PARTS),6);
export const SHIRT_OPTIONS=legacyOnly(options<ShirtStyleId>(SHIRT_PARTS),6);
export const STRAP_OPTIONS=legacyOnly(options<StrapStyleId>(STRAP_PARTS),6);
export const ACCENT_OPTIONS=legacyOnly(options<AccentStyleId>(ACCENT_PARTS),8);
export const HAIR_OPTIONS=options<HairStyleId>(HAIR_PARTS);
export const FACE_OPTIONS=options<FaceShapeId>(FACE_PARTS);
export const EYE_OPTIONS=options<EyeStyleId>(EYE_PARTS);
export const BROW_OPTIONS=options<BrowStyleId>(BROW_PARTS);
export const NOSE_OPTIONS=options<NoseStyleId>(NOSE_PARTS);
export const MOUTH_OPTIONS=options<MouthStyleId>(MOUTH_PARTS);

export const HAIR_COLORS=['#39281d','#4b3021','#6d3c22','#a34b1c','#d77a16','#efaa2e','#2d3540','#1a5c91','#173d70','#6c3f87','#d95c70','#3c884b'];
export const EYE_COLORS=['#5a351b','#9a621f','#4b2d1f','#873c2f','#7b572f','#59662f','#24457f','#6e3d88','#168a91','#5e646a'];
export const SKIN_COLORS=['#ffd0aa','#f6bb8c','#d99b6c','#a96d4a','#70462f'];
export const JACKET_COLORS=['#0b5cad','#2453a4','#166f76','#7a3d8e','#a74343','#3d6d45'];

export const DEFAULT_CHARACTER:CharacterDefinition={
  version:1,
  baseStyle:'female',outfitStyle:'hooded',hoodStyle:'folded',shirtStyle:'tee',strapStyle:'simple',accentStyle:'diamond',clothingLayers:structuredClone(DEFAULT_CLOTHING_LAYERS),hairStyle:'ponytail',faceShape:'soft',eyeStyle:'bright',browStyle:'soft',noseStyle:'diamond',mouthStyle:'smile-open',
  bodyProportions:structuredClone(DEFAULT_BODY_PROPORTIONS),
  colors:{skin:'#ffd0aa',hair:'#39281d',eyes:'#5a351b',brows:'#39281d',jacket:'#0b5cad',accent:'#f1bd42',shirt:DEFAULT_SHIRT_COLOR,trim:DEFAULT_TRIM_COLOR},
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
  const out={...base,...input,bodyProportions:normalizeBodyProportions(input.bodyProportions),clothingLayers:normalizeClothingLayers(input.clothingLayers),colors:{...base.colors,...input.colors},transforms:{...base.transforms}} as CharacterDefinition;
  for(const key of ['eyes','brows','nose','mouth'] as const){out.transforms[key]={...base.transforms[key],...(input.transforms?.[key]??{})};}
  if(!out.baseStyle)out.baseStyle='female';
  if(!out.outfitStyle)out.outfitStyle='hooded';
  if(!out.hoodStyle)out.hoodStyle='folded';
  if(!out.shirtStyle)out.shirtStyle='tee';
  if(!out.strapStyle)out.strapStyle='simple';
  if(!out.accentStyle)out.accentStyle='diamond';
  return out;
}