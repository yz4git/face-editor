import type { CharacterDefinition, ClothingLayerState } from './types';

export type HairBackStyleId='auto'|'short'|'medium'|'long'|'wavy';
export type HairExtraStyleId='none'|'ponytail'|'twin-tail'|'bun'|'braid';
export interface HairModularState{back:HairBackStyleId;extra:HairExtraStyleId}
export type ExpandedCharacterDefinition=CharacterDefinition&{hairModular?:HairModularState};

export const DEFAULT_CLOTHING_LAYERS: ClothingLayerState = {
  outer: 'outfit',
  hood: true,
  strap: true,
  accent: true,
};
export const DEFAULT_HAIR_MODULAR:HairModularState={back:'auto',extra:'none'};
export const HAIR_BACK_OPTIONS:readonly {id:HairBackStyleId;label:string}[]=[
  {id:'auto',label:'AUTO'},{id:'short',label:'SHORT'},{id:'medium',label:'MEDIUM'},{id:'long',label:'LONG'},{id:'wavy',label:'WAVY'},
];
export const HAIR_EXTRA_OPTIONS:readonly {id:HairExtraStyleId;label:string}[]=[
  {id:'none',label:'NONE'},{id:'ponytail',label:'PONYTAIL'},{id:'twin-tail',label:'TWIN TAIL'},{id:'bun',label:'BUN'},{id:'braid',label:'BRAID'},
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
export function shirtColor(definition:CharacterDefinition){return definition.colors.shirt??DEFAULT_SHIRT_COLOR;}
export function trimColor(definition:CharacterDefinition){return definition.colors.trim??DEFAULT_TRIM_COLOR;}
