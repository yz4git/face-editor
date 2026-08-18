import type {
  BrowStyleId, EyeStyleId, FaceShapeId, HairStyleId, MouthStyleId, NoseStyleId, OutfitStyleId, Vec2,
} from '../core/types';

export type GeneratedSourceRole = 'hair' | 'accent' | 'outline' | 'white' | 'eyes' | 'pupil' | 'highlight' | 'skin' | 'brows' | 'mouth' | 'tongue' | 'jacket' | 'shirt' | 'hood';
export interface GeneratedSourceTriangle { role: GeneratedSourceRole; shade: number; points: readonly [Vec2,Vec2,Vec2] }

export const GENERATED_SOURCE_SHEET_META = {
  sourceRevision: 1,
  method: 'generated-source-sheet -> semantic masks -> feature/corner sampling -> Delaunay -> runtime triangle pack',
  hairCount: 10,
  eyeCount: 10,
  faceCount: 10,
  browCount: 10,
  noseCount: 10,
  mouthCount: 10,
  outfitCount: 6,
  triangles: 18082,
} as const;

const ROLES = ["hair", "accent", "outline", "white", "eyes", "pupil", "highlight", "skin", "brows", "mouth", "tongue", "jacket", "shirt", "hood"] as const;
const INDEX = {"hair:ponytail":[0,362],"hair:braid":[362,347],"hair:bob":[709,321],"hair:half-up":[1030,328],"hair:long":[1358,363],"hair:bun":[1721,327],"hair:short-spike":[2048,329],"hair:side-tail":[2377,325],"hair:wavy":[2702,399],"hair:twin-tail":[3101,281],"eye:bright":[3382,482],"eye:determined":[3864,536],"eye:sharp":[4400,483],"eye:round":[4883,449],"eye:soft":[5332,537],"eye:sleepy":[5869,602],"eye:sparkle":[6471,453],"eye:closed":[6924,464],"eye:narrow":[7388,446],"eye:side-glance":[7834,643],"face:soft":[8477,491],"face:oval":[8968,455],"face:angular":[9423,488],"face:round":[9911,451],"face:square":[10362,496],"face:pointed":[10858,469],"face:long-oval":[11327,450],"face:hex":[11777,493],"face:diamond":[12270,455],"face:tapered":[12725,451],"nose:diamond":[13176,102],"nose:small":[13278,98],"nose:line":[13376,92],"nose:soft":[13468,116],"nose:tall":[13584,95],"nose:tiny":[13679,59],"nose:faceted":[13738,121],"nose:profile":[13859,72],"nose:wide":[13931,93],"nose:button":[14024,112],"mouth:smile-open":[14136,281],"mouth:smile":[14417,157],"mouth:neutral":[14574,6],"mouth:soft-smile":[14580,51],"mouth:o":[14631,32],"mouth:surprised":[14663,89],"mouth:smirk":[14752,194],"mouth:frown":[14946,53],"mouth:wide-open":[14999,295],"mouth:curve":[15294,34],"brow:soft":[15328,94],"brow:straight":[15422,123],"brow:angled":[15545,93],"brow:thin":[15638,85],"brow:bold":[15723,93],"brow:arched":[15816,68],"brow:calm":[15884,83],"brow:raised":[15967,87],"brow:flat":[16054,66],"brow:worried":[16120,73],"outfit:hooded":[16193,334],"outfit:high-collar":[16527,299],"outfit:zip-collar":[16826,312],"outfit:drawstring":[17138,342],"outfit:short-sleeve":[17480,316],"outfit:vest":[17796,286]} as const;
const PACK = 'AAABAAIAAQABAAIAAQADAAIAAQAEAAIAAQAFAAMAAgAGAAQAAgAHAAQAAgAIAAQAAQAJAAQAAQAKAAQAAQALAAUAAQAMAAUAAQANAAUAAQAOAAYAAQAPAAYAAQAGAAcAAQAHAAcAAQAI' + '';
