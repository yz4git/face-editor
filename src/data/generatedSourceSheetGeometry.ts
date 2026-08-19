import type { Vec2 } from '../core/types';
import { SOURCE_SHEET_GZIP_0 } from './generated/sourceSheetGzip0';
import { SOURCE_SHEET_GZIP_1 } from './generated/sourceSheetGzip1';
import { SOURCE_SHEET_GZIP_2A } from './generated/sourceSheetGzip2a';
import { SOURCE_SHEET_GZIP_2B } from './generated/sourceSheetGzip2b';
import { SOURCE_SHEET_GZIP_3A } from './generated/sourceSheetGzip3a';
import { SOURCE_SHEET_GZIP_3B } from './generated/sourceSheetGzip3b';
import { autoRepairGeometry } from './generated/autoRepairGeometry';

export type GeneratedSourceRole = 'hair' | 'accent' | 'outline' | 'white' | 'eyes' | 'pupil' | 'highlight' | 'skin' | 'brows' | 'mouth' | 'tongue' | 'jacket' | 'shirt' | 'hood';
export type GeneratedSourceKind = 'hair' | 'eye' | 'face' | 'brow' | 'nose' | 'mouth' | 'outfit';
export interface GeneratedSourceTriangle { role: GeneratedSourceRole; shade: number; points: readonly [Vec2,Vec2,Vec2] }

export const GENERATED_SOURCE_SHEET_META = {
  sourceRevision: 1,
  method: 'generated-source-sheet -> semantic masks -> feature/corner sampling -> Delaunay -> runtime triangle pack',
  hairCount: 10,eyeCount: 10,faceCount: 10,browCount: 10,noseCount: 10,mouthCount: 10,outfitCount: 6,
  triangles: 6581,recordBytes: 14,coordinateScale: 10000,compressedBase64Length: 62860,
} as const;

const ROLES = ['hair','accent','outline','white','eyes','pupil','highlight','skin','brows','mouth','tongue','jacket','shirt','hood'] as const;
const INDEX = {"hair:ponytail":[0,106],"hair:braid":[106,109],"hair:bob":[215,102],"hair:half-up":[317,104],"hair:long":[421,110],"hair:bun":[531,101],"hair:short-spike":[632,105],"hair:side-tail":[737,96],"hair:wavy":[833,125],"hair:twin-tail":[958,97],"eye:bright":[1055,217],"eye:determined":[1272,233],"eye:sharp":[1505,226],"eye:round":[1731,214],"eye:soft":[1945,234],"eye:sleepy":[2179,289],"eye:sparkle":[2468,206],"eye:closed":[2674,202],"eye:narrow":[2876,214],"eye:side-glance":[3090,311],"face:soft":[3401,116],"face:oval":[3517,109],"face:angular":[3626,109],"face:round":[3735,109],"face:square":[3844,114],"face:pointed":[3958,105],"face:long-oval":[4063,103],"face:hex":[4166,129],"face:diamond":[4295,121],"face:tapered":[4416,108],"nose:diamond":[4524,36],"nose:small":[4560,33],"nose:line":[4593,29],"nose:soft":[4622,37],"nose:tall":[4659,40],"nose:tiny":[4699,25],"nose:faceted":[4724,40],"nose:profile":[4764,27],"nose:wide":[4791,38],"nose:button":[4829,47],"mouth:smile-open":[4876,123],"mouth:smile":[4999,77],"mouth:neutral":[5076,2],"mouth:soft-smile":[5078,28],"mouth:o":[5106,18],"mouth:surprised":[5124,54],"mouth:smirk":[5178,91],"mouth:frown":[5269,31],"mouth:wide-open":[5300,140],"mouth:curve":[5440,30],"brow:soft":[5470,23],"brow:straight":[5493,31],"brow:angled":[5524,29],"brow:thin":[5553,25],"brow:bold":[5578,25],"brow:arched":[5603,26],"brow:calm":[5629,26],"brow:raised":[5655,28],"brow:flat":[5683,22],"brow:worried":[5705,24],"outfit:hooded":[5729,152],"outfit:high-collar":[5881,130],"outfit:zip-collar":[6011,133],"outfit:drawstring":[6144,156],"outfit:short-sleeve":[6300,141],"outfit:vest":[6441,140]} as const;
type GeneratedSourceKey = keyof typeof INDEX;

const PACK = SOURCE_SHEET_GZIP_0 + SOURCE_SHEET_GZIP_1 + SOURCE_SHEET_GZIP_2A + SOURCE_SHEET_GZIP_2B + SOURCE_SHEET_GZIP_3A + SOURCE_SHEET_GZIP_3B;
const RECORD_BYTES = GENERATED_SOURCE_SHEET_META.recordBytes,COORD_SCALE = GENERATED_SOURCE_SHEET_META.coordinateScale;
if(PACK.length!==GENERATED_SOURCE_SHEET_META.compressedBase64Length)throw new Error(`Generated source-sheet compressed payload length mismatch: ${PACK.length}`);

function decodeBase64(value:string):Uint8Array<ArrayBuffer>{const binary=atob(value),out=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return out;}
async function inflateGzip(value:string):Promise<Uint8Array<ArrayBuffer>>{
  if(typeof DecompressionStream==='undefined')throw new Error('This browser does not support gzip DecompressionStream required by generated polygon assets.');
  const compressed=decodeBase64(value),copy=new Uint8Array(compressed.byteLength);copy.set(compressed);
  const stream=new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const raw=await inflateGzip(PACK),expectedBytes=GENERATED_SOURCE_SHEET_META.triangles*RECORD_BYTES;
if(raw.byteLength!==expectedBytes)throw new Error(`Generated source-sheet geometry length mismatch: ${raw.byteLength} !== ${expectedBytes}`);
const view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
function decodeTriangle(recordIndex:number):GeneratedSourceTriangle{const off=recordIndex*RECORD_BYTES,point=(index:number):Vec2=>[view.getInt16(off+index*4,true)/COORD_SCALE,view.getInt16(off+index*4+2,true)/COORD_SCALE],roleIndex=view.getUint8(off+13),role=ROLES[roleIndex];if(!role)throw new Error(`Unknown generated source role ${roleIndex} at triangle ${recordIndex}`);return{points:[point(0),point(1),point(2)],shade:view.getInt8(off+12),role};}
const PARTS={} as Record<GeneratedSourceKey,readonly GeneratedSourceTriangle[]>;
for(const [key,[start,count]] of Object.entries(INDEX) as [GeneratedSourceKey,readonly [number,number]][])PARTS[key]=Array.from({length:count},(_,i)=>decodeTriangle(start+i));
export function generatedSourceTriangles(kind:GeneratedSourceKind,id:string):readonly GeneratedSourceTriangle[]{
  const override=autoRepairGeometry(kind,id);if(override){return override.triangles.map(triangle=>{const role=triangle.role as GeneratedSourceRole;if(!(ROLES as readonly string[]).includes(role))throw new Error(`Unknown auto-repair role ${triangle.role} for ${kind}:${id}`);return{role,shade:triangle.shade,points:triangle.points};});}
  const key=`${kind}:${id}` as GeneratedSourceKey,triangles=PARTS[key];if(!triangles)throw new Error(`No generated source-sheet geometry for ${key}`);return triangles;
}
export function generatedSourceTriangleCount(kind:GeneratedSourceKind,id:string):number{return generatedSourceTriangles(kind,id).length;}
export const GENERATED_SOURCE_KEYS=Object.freeze(Object.keys(INDEX) as GeneratedSourceKey[]);
