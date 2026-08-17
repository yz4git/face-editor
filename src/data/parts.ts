import type { BrowStyleId, CharacterDefinition, EyeStyleId, FaceShapeId, HairStyleId, MouthStyleId, NoseStyleId } from '../core/types';

export interface Option<T extends string> { id: T; label: string }

export const HAIR_OPTIONS: Option<HairStyleId>[] = [
  { id: 'ponytail', label: 'Ponytail' }, { id: 'short-spike', label: 'Short spike' },
  { id: 'bob', label: 'Bob' }, { id: 'long', label: 'Long' },
  { id: 'side-tail', label: 'Side tail' }, { id: 'twin-tail', label: 'Twin tail' },
];
export const FACE_OPTIONS: Option<FaceShapeId>[] = [
  { id: 'soft', label: 'Soft' }, { id: 'oval', label: 'Oval' }, { id: 'angular', label: 'Angular' }, { id: 'round', label: 'Round' },
];
export const EYE_OPTIONS: Option<EyeStyleId>[] = [
  { id: 'bright', label: 'Bright' }, { id: 'soft', label: 'Soft' }, { id: 'sharp', label: 'Sharp' }, { id: 'round', label: 'Round' }, { id: 'narrow', label: 'Narrow' },
];
export const BROW_OPTIONS: Option<BrowStyleId>[] = [
  { id: 'soft', label: 'Soft' }, { id: 'straight', label: 'Straight' }, { id: 'angled', label: 'Angled' }, { id: 'thin', label: 'Thin' }, { id: 'bold', label: 'Bold' },
];
export const NOSE_OPTIONS: Option<NoseStyleId>[] = [
  { id: 'diamond', label: 'Diamond' }, { id: 'small', label: 'Small' }, { id: 'line', label: 'Line' }, { id: 'soft', label: 'Soft' },
];
export const MOUTH_OPTIONS: Option<MouthStyleId>[] = [
  { id: 'smile-open', label: 'Open smile' }, { id: 'smile', label: 'Smile' }, { id: 'neutral', label: 'Neutral' }, { id: 'soft-smile', label: 'Soft smile' }, { id: 'o', label: 'O' },
];

export const HAIR_COLORS = ['#39281d','#4b3021','#6d3c22','#a34b1c','#d77a16','#efaa2e','#2d3540','#1a5c91','#173d70','#6c3f87','#d95c70','#3c884b'];
export const EYE_COLORS = ['#5a351b','#145a9b','#3c8732','#5e646a','#6e3d88','#168a91'];
export const SKIN_COLORS = ['#ffd0aa','#f6bb8c','#d99b6c','#a96d4a','#70462f'];
export const JACKET_COLORS = ['#0b5cad','#2453a4','#166f76','#7a3d8e','#a74343','#3d6d45'];

export const DEFAULT_CHARACTER: CharacterDefinition = {
  version: 1,
  hairStyle: 'ponytail', faceShape: 'soft', eyeStyle: 'bright', browStyle: 'soft', noseStyle: 'diamond', mouthStyle: 'smile-open',
  colors: { skin: '#ffd0aa', hair: '#39281d', eyes: '#5a351b', brows: '#39281d', jacket: '#0b5cad', accent: '#f1bd42' },
  transforms: {
    eyes: { x:0,y:0,scaleX:1,scaleY:1,rotation:0 }, brows: { x:0,y:0,scaleX:1,scaleY:1,rotation:0 },
    nose: { x:0,y:0,scaleX:1,scaleY:1,rotation:0 }, mouth: { x:0,y:0,scaleX:1,scaleY:1,rotation:0 },
  },
};
