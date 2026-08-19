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
export type HoodStyleId = 'folded' | 'drawstring' | 'sharp' | 'high' | 'wide' | 'wing';
export type ShirtStyleId = 'tee' | 'long-sleeve' | 'tank' | 'three-quarter' | 'turtleneck' | 'sleeveless-high';
export type StrapStyleId = 'simple' | 'padded' | 'single-pouch' | 'double-pouch' | 'cross' | 'y-harness';
export type AccentStyleId = 'diamond' | 'long-strip' | 'point-strip' | 'corner' | 'chevron' | 'slash' | 'taper' | 'triangle';
export type ExpressionId = 'neutral' | 'smile' | 'happy' | 'angry' | 'sad' | 'surprised' | 'serious' | 'blink';
export type PoseId = 'idle' | 'relax' | 'confident' | 'cute' | 'cool' | 'fight' | 'run' | 'jump';
export type MotionActionId = 'none' | 'breathe' | 'blink' | 'talk' | 'wave' | 'walk' | 'run';
export type CutsceneTemplateId = 'intro' | 'reaction' | 'battle';
export type PartCategory = 'body' | 'outfit' | 'hair' | 'face' | 'eye' | 'brow' | 'nose' | 'mouth';
export type ColorRole = 'skin' | 'hair' | 'eyes' | 'brows' | 'jacket' | 'accent' | 'shirt' | 'hood' | 'strap' | 'metal' | 'white' | 'mouth' | 'tongue' | 'pupil';

export interface PartTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  spacing?: number;
}

export interface BodyProportions {
  height: number;
  build: number;
  shoulders: number;
}

export interface CharacterMotionState {
  version: 1;
  pose: PoseId;
  action: MotionActionId;
  playing: boolean;
  autoBlink: boolean;
}

export interface CutsceneCameraState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface CutsceneCue {
  id: string;
  timeMs: number;
  label: string;
  expression?: ExpressionId;
  pose?: PoseId;
  action?: MotionActionId;
  camera?: CutsceneCameraState;
  dialogue?: string;
}

export interface CutsceneProject {
  version: 1;
  title: string;
  durationMs: number;
  cues: CutsceneCue[];
}

export interface ExpressionTransformDelta {
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  spacing?: number;
}

export interface ExpressionPresetDefinition {
  id: ExpressionId;
  label: string;
  description: string;
  eyeStyle?: EyeStyleId;
  browStyle?: BrowStyleId;
  mouthStyle?: MouthStyleId;
  transforms?: Partial<Record<'eyes'|'brows'|'nose'|'mouth',ExpressionTransformDelta>>;
}

export interface CharacterExpressionSet {
  version: 1;
  defaultExpression: ExpressionId;
  expressions: Record<ExpressionId,ExpressionPresetDefinition>;
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
  hoodStyle: HoodStyleId;
  shirtStyle: ShirtStyleId;
  strapStyle: StrapStyleId;
  accentStyle: AccentStyleId;
  hairStyle: HairStyleId;
  faceShape: FaceShapeId;
  eyeStyle: EyeStyleId;
  browStyle: BrowStyleId;
  noseStyle: NoseStyleId;
  mouthStyle: MouthStyleId;
  bodyProportions?: BodyProportions;
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
  expressions?: {
    active: ExpressionId;
    set: CharacterExpressionSet;
  };
  motion?: CharacterMotionState;
  cutscene?: CutsceneProject;
  mesh: {
    version: 1;
    layers: SerializablePolygonLayer[];
    bounds: CompiledPolygonCharacter['bounds'];
  };
}

export const identityTransform = (): PartTransform => ({ x:0, y:0, scaleX:1, scaleY:1, rotation:0, spacing:0 });