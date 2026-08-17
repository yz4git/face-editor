export type Vec2 = readonly [number, number];
export type Triangle = readonly [Vec2, Vec2, Vec2];

export type HairStyleId = 'ponytail' | 'short-spike' | 'bob' | 'long' | 'side-tail' | 'twin-tail';
export type FaceShapeId = 'soft' | 'oval' | 'angular' | 'round';
export type EyeStyleId = 'bright' | 'soft' | 'sharp' | 'round' | 'narrow';
export type BrowStyleId = 'soft' | 'straight' | 'angled' | 'thin' | 'bold';
export type NoseStyleId = 'diamond' | 'small' | 'line' | 'soft';
export type MouthStyleId = 'smile-open' | 'smile' | 'neutral' | 'soft-smile' | 'o';

export interface PartTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export interface CharacterDefinition {
  version: 1;
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
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
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

export const identityTransform = (): PartTransform => ({
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
});
