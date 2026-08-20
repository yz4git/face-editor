import type { Vec2 } from '../core/types';
import { GARMENT_REFERENCE_QUALITY_V1_GZIP_0 } from './generated/garmentReferenceQualityV1Gzip0';
import { GARMENT_REFERENCE_QUALITY_V1_GZIP_1 } from './generated/garmentReferenceQualityV1Gzip1';
import { GARMENT_REFERENCE_QUALITY_V1_GZIP_2 } from './generated/garmentReferenceQualityV1Gzip2';

/**
 * Jacket & Inner Quality Pass v1
 *
 * Derived from the two generated 1536x1024 authoring-reference sheets.
 * Runtime stores only normalized coordinates, semantic role and additive shade.
 * No source pixels or textures are shipped in the character data.
 */
export type GarmentReferenceQualityV1Kind='outfit'|'shirt';
export type GarmentReferenceQualityV1Role='jacket'|'shirt';
export interface GarmentReferenceQualityV1Triangle{
  role:GarmentReferenceQualityV1Role;
  shade:number;
  points:readonly [Vec2,Vec2,Vec2];
}

export const GARMENT_REFERENCE_QUALITY_V1_META={
  sourceRevision:1,
  method:'generated garment reference sheets -> dark garment semantic mask -> contour/seam/corner sampling -> coverage-gated Delaunay -> normalized 14-byte triangle pack -> source-width calibration',
  sourceDimensions:[1536,1024] as const,
  grid:[3,2] as const,
  outfitCount:6,
  shirtCount:6,
  triangles:1078,
  recordBytes:14,
  coordinateScale:10000,
  compressedBase64Length:10584,
  sourceSha256:{
    jackets:'bced45200fba7751f3115bd187493f20331796d73c8b694e02375da41b9e6b73',
    shirts:'9331b481624a95d9211af636ac5d0f3e7866d959534c4226a56038686e6e48ad',
  },
  sourceWidthPixels:{tee:381,'long-sleeve':440,turtleneck:442},
  triangleCounts:{
    'outfit:blazer':86,
    'outfit:bomber':100,
    'outfit:long-coat':79,
    'outfit:tactical-jacket':117,
    'outfit:cropped-jacket':100,
    'outfit:tech-parka':120,
    'shirt:tee':88,
    'shirt:long-sleeve':78,
    'shirt:tank':74,
    'shirt:turtleneck':74,
    'shirt:henley':79,
    'shirt:dress-shirt':83,
  },
} as const;

const ROLES:readonly GarmentReferenceQualityV1Role[]=['jacket','shirt'];
const INDEX={
  'outfit:blazer':[0,86],
  'outfit:bomber':[86,100],
  'outfit:long-coat':[186,79],
  'outfit:tactical-jacket':[265,117],
  'outfit:cropped-jacket':[382,100],
  'outfit:tech-parka':[482,120],
  'shirt:tee':[602,88],
  'shirt:long-sleeve':[690,78],
  'shirt:tank':[768,74],
  'shirt:turtleneck':[842,74],
  'shirt:henley':[916,79],
  'shirt:dress-shirt':[995,83],
} as const;
type GarmentReferenceQualityV1Key=keyof typeof INDEX;

const PACK=GARMENT_REFERENCE_QUALITY_V1_GZIP_0+GARMENT_REFERENCE_QUALITY_V1_GZIP_1+GARMENT_REFERENCE_QUALITY_V1_GZIP_2;
if(PACK.length!==GARMENT_REFERENCE_QUALITY_V1_META.compressedBase64Length)throw new Error(`Garment reference pack length mismatch: ${PACK.length}`);

function decodeBase64(value:string):Uint8Array<ArrayBuffer>{
  const binary=atob(value),out=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);
  return out;
}
async function inflateGzip(value:string):Promise<Uint8Array<ArrayBuffer>>{
  if(typeof DecompressionStream==='undefined')throw new Error('This browser does not support gzip DecompressionStream required by garment polygon assets.');
  const compressed=decodeBase64(value),copy=new Uint8Array(compressed.byteLength);copy.set(compressed);
  const stream=new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const raw=await inflateGzip(PACK),expectedBytes=GARMENT_REFERENCE_QUALITY_V1_META.triangles*GARMENT_REFERENCE_QUALITY_V1_META.recordBytes;
if(raw.byteLength!==expectedBytes)throw new Error(`Garment reference geometry length mismatch: ${raw.byteLength} !== ${expectedBytes}`);
const view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength),SCALE=GARMENT_REFERENCE_QUALITY_V1_META.coordinateScale;
function decodeTriangle(recordIndex:number):GarmentReferenceQualityV1Triangle{
  const offset=recordIndex*GARMENT_REFERENCE_QUALITY_V1_META.recordBytes;
  const point=(index:number):Vec2=>[view.getInt16(offset+index*4,true)/SCALE,view.getInt16(offset+index*4+2,true)/SCALE];
  const role=ROLES[view.getUint8(offset+13)];
  if(!role)throw new Error(`Unknown garment reference role at triangle ${recordIndex}`);
  return{points:[point(0),point(1),point(2)],shade:view.getInt8(offset+12),role};
}

const RAW_PARTS={} as Record<GarmentReferenceQualityV1Key,readonly GarmentReferenceQualityV1Triangle[]>;
for(const[key,[start,count]]of Object.entries(INDEX) as [GarmentReferenceQualityV1Key,readonly[number,number]][])RAW_PARTS[key]=Array.from({length:count},(_,index)=>decodeTriangle(start+index));

/**
 * The generator framed each 3x2 cell independently. That is useful for tracing detail, but it
 * compressed the apparent width difference between the tee (381 source pixels) and the two
 * long-sleeved references (440/442 source pixels). Restore those authored sheet proportions
 * after decoding so sleeve length/silhouette survive into the editor instead of collapsing back
 * toward the tee footprint.
 */
const SOURCE_WIDTH_CALIBRATION:Partial<Record<GarmentReferenceQualityV1Key,number>>={
  'shirt:long-sleeve':440/381,
  'shirt:turtleneck':(442/381)/(1.8642/2),
};
function calibrateSourceWidth(key:GarmentReferenceQualityV1Key,triangles:readonly GarmentReferenceQualityV1Triangle[]):readonly GarmentReferenceQualityV1Triangle[]{
  const scaleX=SOURCE_WIDTH_CALIBRATION[key];if(!scaleX)return triangles;
  let minX=Infinity,maxX=-Infinity;for(const triangle of triangles)for(const point of triangle.points){minX=Math.min(minX,point[0]);maxX=Math.max(maxX,point[0]);}
  const centerX=(minX+maxX)/2;
  return triangles.map(triangle=>({...triangle,points:triangle.points.map(([x,y])=>[centerX+(x-centerX)*scaleX,y] as Vec2) as unknown as readonly [Vec2,Vec2,Vec2]}));
}
const PARTS={} as Record<GarmentReferenceQualityV1Key,readonly GarmentReferenceQualityV1Triangle[]>;
for(const key of Object.keys(INDEX) as GarmentReferenceQualityV1Key[])PARTS[key]=calibrateSourceWidth(key,RAW_PARTS[key]);

export function garmentReferenceQualityV1Triangles(kind:GarmentReferenceQualityV1Kind,id:string):readonly GarmentReferenceQualityV1Triangle[]{
  const key=`${kind}:${id}` as GarmentReferenceQualityV1Key,value=PARTS[key];
  if(!value)throw new Error(`Unknown garment reference geometry ${key}`);
  return value;
}
export function garmentReferenceQualityV1TriangleCount(kind:GarmentReferenceQualityV1Kind,id:string):number{return garmentReferenceQualityV1Triangles(kind,id).length;}
export const GARMENT_REFERENCE_QUALITY_V1_KEYS=Object.freeze(Object.keys(INDEX) as GarmentReferenceQualityV1Key[]);
