export type Vec2 = readonly [number, number];
export type Triangle = readonly [Vec2, Vec2, Vec2];

export type CharacterBaseId = 'female' | 'male';
export type HairStyleId = 'ponytail' | 'bob' | 'side-tail' | 'twin-tail' | 'braid' | 'long' | 'wavy' | 'short-spike' | 'bun' | 'half-up';
export type FaceShapeId = 'soft' | 'oval' | 'angular' | 'round' | 'square' | 'pointed' | 'long-oval' | 'hex' | 'diamond' | 'tapered';
export type EyeStyleId = 'bright' | 'determined' | 'sharp' | 'round' | 'soft' | 'sleepy' | 'sparkle' | 'closed' | 'narrow' | 'side-glance';
export type BrowStyleId = 'soft' | 'straight' | 'angled' | 'thin' | 'bold' | 'arched' | 'calm' | 'raised' | 'flat' | 'worried';
export type NoseStyleId = 'diamond' | 'small' | 'line' | 'soft' | 'tall' | 'tiny' | 'faceted' | 'profile' | 'wide' | 'button';
export type MouthStyleId = 'smile-open' | 'smile' | 'neutral' | 'soft-smile' | 'o' | 'surprised' | 'smirk' | 'frown' | 'wide-open' | 'curve';
export type OutfitStyleId = 'hooded' | 'high-collar' | 'zip-collar' | 'drawstring' | 'short-sleeve' | 'vest';
export type PartCategory = 'body' | 'outfit' | 'hair' | 'face' | 'eye' | 'brow' | 'nose' | 'mouth';
export type ColorRole = 'skin' | 'hair' | 'eyes' | 'brows' | 'jacket' | 'accent' | 'shirt' | 'hood' | 'strap' | 'white' | 'mouth' | 'tongue' | 'pupil';

export interface PartTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  spacing?: number;
}

export interface PartTriangleDefinition {
  points: Triangle;
  colorRole: ColorRole;
  shade?: number;
  layer: string;
  zIndex: number;
}

export interface PartDefinition<T extends string = string> {
  id: T;
  label: string;
  category: PartCategory;
  anchor: Vec2;
  bounds: { minX:number; minY:number; maxX:number; maxY:number };
  tags: readonly string[];
  triangles: readonly PartTriangleDefinition[];
}

export interface CharacterDefinition {
  version: 1;
  baseStyle: CharacterBaseId;
  outfitStyle: OutfitStyleId;
  hairStyle: HairStyleId;
  faceShape: FaceShapeId;
  eyeStyle: EyeStyleId;
  browStyle: BrowStyleId;
  noseStyle: NoseStyleId;
  mouthStyle: MouthStyleId;
  colors: {
    skin: string;
    hair: string;
    eyes: string;
    brows: string;
    jacket: string;
    accent: string;
  };
  transforms: {
    eyes: PartTransform;
    brows: PartTransform;
    nose: PartTransform;
    mouth: PartTransform;
  };
}

export interface CompiledPolygonLayer {
  id: string;
  zIndex: number;
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint16Array;
}

export interface CompiledPolygonCharacter {
  version: 1;
  layers: CompiledPolygonLayer[];
  bounds: { minX:number; minY:number; maxX:number; maxY:number };
}

export interface SerializablePolygonLayer {
  id: string;
  zIndex: number;
  positions: number[];
  colors: number[];
  indices: number[];
}

export interface CharacterBundle {
  format: 'face-editor-polygon-character';
  formatVersion: 1;
  definition: CharacterDefinition;
  mesh: {
    version: 1;
    layers: SerializablePolygonLayer[];
    bounds: CompiledPolygonCharacter['bounds'];
  };
}

export const identityTransform = (): PartTransform => ({ x:0, y:0, scaleX:1, scaleY:1, rotation:0, spacing:0 });
