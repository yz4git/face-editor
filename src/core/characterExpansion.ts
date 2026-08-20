import type { CharacterDefinition, ClothingLayerState } from './types';

export type HairBackStyleId='auto'|'short'|'medium'|'long'|'wavy';
export type HairExtraStyleId='none'|'ponytail'|'twin-tail'|'bun'|'braid';
export interface HairModularState{back:HairBackStyleId;extra:HairExtraStyleId}

export type HeadwearStyleId='none'|'cap'|'beanie'|'beret'|'headband'|'headphones'|'goggles-up'|'small-crown'|'sci-fi-visor';
export type EyewearStyleId='none'|'round-glasses'|'square-glasses'|'thin-frame'|'sunglasses'|'monocle'|'sport-goggles'|'cyber-visor'|'eyepatch';
export type FaceDetailStyleId='none'|'mole'|'freckles'|'blush'|'scar'|'bandage'|'face-paint'|'cheek-mark'|'under-eye-line';
export type EarAccessoryStyleId='none'|'stud-earring'|'hoop-earring'|'ear-cuff'|'double-earring'|'chain-earring'|'comms-device'|'cyber-earpiece'|'star-earring';
export interface AccessoryState{headwear:HeadwearStyleId;eyewear:EyewearStyleId;faceDetail:FaceDetailStyleId;earAccessory:EarAccessoryStyleId}

export type ExpandedCharacterDefinition=CharacterDefinition&{hairModular?:HairModularState;accessories?:AccessoryState};

export const DEFAULT_CLOTHING_LAYERS: ClothingLayerState = {
  outer: 'outfit',
  hood: true,
  strap: true,
  accent: true,
};
export const DEFAULT_HAIR_MODULAR:HairModularState={back:'auto',extra:'none'};
export const DEFAULT_ACCESSORIES:AccessoryState={headwear:'none',eyewear:'none',faceDetail:'none',earAccessory:'none'};

export const HAIR_BACK_OPTIONS:readonly {id:HairBackStyleId;label:string}[]=[
  {id:'auto',label:'AUTO'},{id:'short',label:'SHORT'},{id:'medium',label:'MEDIUM'},{id:'long',label:'LONG'},{id:'wavy',label:'WAVY'},
];
export const HAIR_EXTRA_OPTIONS:readonly {id:HairExtraStyleId;label:string}[]=[
  {id:'none',label:'NONE'},{id:'ponytail',label:'PONYTAIL'},{id:'twin-tail',label:'TWIN TAIL'},{id:'bun',label:'BUN'},{id:'braid',label:'BRAID'},
];

export const HEADWEAR_OPTIONS:readonly {id:HeadwearStyleId;label:string}[]=[
  {id:'none',label:'NONE'},{id:'cap',label:'CAP'},{id:'beanie',label:'BEANIE'},{id:'beret',label:'BERET'},{id:'headband',label:'HEADBAND'},{id:'headphones',label:'HEADPHONES'},{id:'goggles-up',label:'GOGGLES UP'},{id:'small-crown',label:'CROWN'},{id:'sci-fi-visor',label:'SCI-FI VISOR'},
];
export const EYEWEAR_OPTIONS:readonly {id:EyewearStyleId;label:string}[]=[
  {id:'none',label:'NONE'},{id:'round-glasses',label:'ROUND'},{id:'square-glasses',label:'SQUARE'},{id:'thin-frame',label:'THIN FRAME'},{id:'sunglasses',label:'SUNGLASSES'},{id:'monocle',label:'MONOCLE'},{id:'sport-goggles',label:'SPORT GOGGLES'},{id:'cyber-visor',label:'CYBER VISOR'},{id:'eyepatch',label:'EYEPATCH'},
];
export const FACE_DETAIL_OPTIONS:readonly {id:FaceDetailStyleId;label:string}[]=[
  {id:'none',label:'NONE'},{id:'mole',label:'MOLE'},{id:'freckles',label:'FRECKLES'},{id:'blush',label:'BLUSH'},{id:'scar',label:'SCAR'},{id:'bandage',label:'BANDAGE'},{id:'face-paint',label:'FACE PAINT'},{id:'cheek-mark',label:'CHEEK MARK'},{id:'under-eye-line',label:'UNDER-EYE'},
];
export const EAR_ACCESSORY_OPTIONS:readonly {id:EarAccessoryStyleId;label:string}[]=[
  {id:'none',label:'NONE'},{id:'stud-earring',label:'STUD'},{id:'hoop-earring',label:'HOOP'},{id:'ear-cuff',label:'EAR CUFF'},{id:'double-earring',label:'DOUBLE'},{id:'chain-earring',label:'CHAIN'},{id:'comms-device',label:'COMMS'},{id:'cyber-earpiece',label:'CYBER EAR'},{id:'star-earring',label:'STAR'},
];

export const DEFAULT_SHIRT_COLOR='#16212b';
export const DEFAULT_TRIM_COLOR='#f3eee4';
export const SHIRT_COLORS=['#16212b','#f4eee5','#dfe8ef','#424c57','#6e3e48','#29485a','#36513f','#7b674c'];
export const TRIM_COLORS=['#f3eee4','#d4d8dd','#9aa5af','#433d39','#163f5c','#6d3d4f','#38564a','#b98d3f'];
export const ACCENT_COLORS=['#f1bd42','#f06b47','#56c4d8','#e8578a','#9f7aea','#70c46b','#edf4ff','#ffcf5a'];

export function normalizeClothingLayers(value: CharacterDefinition['clothingLayers']): ClothingLayerState {
  if (!value) return structuredClone(DEFAULT_CLOTHING_LAYERS);
  return {
    outer: value.outer === 'shirt-only' ? 'shirt-only' : 'outfit',
    hood: value.hood !== false,
    strap: value.strap !== false,
    accent: value.accent !== false,
  };
}

export function normalizeHairModular(definition:CharacterDefinition):HairModularState{
  const value=(definition as ExpandedCharacterDefinition).hairModular;
  const back:HairBackStyleId=value&&HAIR_BACK_OPTIONS.some(item=>item.id===value.back)?value.back:'auto';
  const extra:HairExtraStyleId=value&&HAIR_EXTRA_OPTIONS.some(item=>item.id===value.extra)?value.extra:'none';
  return{back,extra};
}
export function setHairModular(definition:CharacterDefinition,state:HairModularState){(definition as ExpandedCharacterDefinition).hairModular=structuredClone(state);return definition;}

export function normalizeAccessories(definition:CharacterDefinition):AccessoryState{
  const value=(definition as ExpandedCharacterDefinition).accessories;
  return{
    headwear:value&&HEADWEAR_OPTIONS.some(item=>item.id===value.headwear)?value.headwear:'none',
    eyewear:value&&EYEWEAR_OPTIONS.some(item=>item.id===value.eyewear)?value.eyewear:'none',
    faceDetail:value&&FACE_DETAIL_OPTIONS.some(item=>item.id===value.faceDetail)?value.faceDetail:'none',
    earAccessory:value&&EAR_ACCESSORY_OPTIONS.some(item=>item.id===value.earAccessory)?value.earAccessory:'none',
  };
}
export function setAccessories(definition:CharacterDefinition,state:AccessoryState){(definition as ExpandedCharacterDefinition).accessories=structuredClone(state);return definition;}
export function shirtColor(definition:CharacterDefinition){return definition.colors.shirt??DEFAULT_SHIRT_COLOR;}
export function trimColor(definition:CharacterDefinition){return definition.colors.trim??DEFAULT_TRIM_COLOR;}
