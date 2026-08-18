import type { Vec2 } from '../core/types';
import { OUTFIT_COMPONENT_GZIP } from './generated/outfitComponentGzip';

export type OutfitComponentKind='hood'|'shirt'|'strap'|'accent';
export type OutfitComponentRole='hood'|'shirt'|'strap'|'metal'|'accent';
export interface OutfitComponentTriangle{role:OutfitComponentRole;points:readonly [Vec2,Vec2,Vec2];shade:number}

export const GENERATED_OUTFIT_COMPONENT_META={
  sourceRevision:1,
  method:'outfits source sheet rows 2-5 -> semantic masks -> corners/interior points -> Delaunay -> 14-byte triangle pack',
  hoodCount:6,shirtCount:6,strapCount:6,accentCount:8,triangles:1818,recordBytes:14,coordinateScale:10000,compressedBase64Length:18136,
} as const;

const ROLES:readonly OutfitComponentRole[]=['hood','shirt','strap','metal','accent'];
const INDEX={
  'hood:folded':[0,57],'hood:drawstring':[57,53],'hood:sharp':[110,46],'hood:high':[156,54],'hood:wide':[210,50],'hood:wing':[260,60],
  'shirt:tee':[320,129],'shirt:long-sleeve':[449,148],'shirt:tank':[597,135],'shirt:three-quarter':[732,132],'shirt:turtleneck':[864,145],'shirt:sleeveless-high':[1009,125],
  'strap:simple':[1134,47],'strap:padded':[1181,59],'strap:single-pouch':[1240,66],'strap:double-pouch':[1306,63],'strap:cross':[1369,59],'strap:y-harness':[1428,57],
  'accent:diamond':[1485,66],'accent:long-strip':[1551,33],'accent:point-strip':[1584,32],'accent:corner':[1616,31],'accent:chevron':[1647,38],'accent:slash':[1685,40],'accent:taper':[1725,51],'accent:triangle':[1776,42],
} as const;
export const GENERATED_OUTFIT_COMPONENT_KEYS=Object.keys(INDEX) as (keyof typeof INDEX)[];

async function inflateGzip(value:string):Promise<Uint8Array>{
  const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
const raw=await inflateGzip(OUTFIT_COMPONENT_GZIP);
if(raw.byteLength!==GENERATED_OUTFIT_COMPONENT_META.triangles*GENERATED_OUTFIT_COMPONENT_META.recordBytes)throw new Error(`Outfit component pack size mismatch: ${raw.byteLength}`);
const view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
const PARTS=new Map<string,readonly OutfitComponentTriangle[]>();
for(const[key,[start,count]]of Object.entries(INDEX)){
  const triangles:OutfitComponentTriangle[]=[];
  for(let i=0;i<count;i++){
    const offset=(start+i)*14,coords:number[]=[];
    for(let j=0;j<6;j++)coords.push(view.getInt16(offset+j*2,true)/10000);
    const shade=view.getInt8(offset+12),role=ROLES[view.getUint8(offset+13)];
    if(!role)throw new Error(`Unknown outfit component role in ${key}`);
    triangles.push({role,shade,points:[[coords[0],coords[1]],[coords[2],coords[3]],[coords[4],coords[5]]]});
  }
  PARTS.set(key,triangles);
}

export function generatedOutfitComponentTriangles(kind:OutfitComponentKind,id:string):readonly OutfitComponentTriangle[]{
  const value=PARTS.get(`${kind}:${id}`);if(!value)throw new Error(`Unknown generated outfit component ${kind}:${id}`);return value;
}
export function generatedOutfitComponentTriangleCount(kind:OutfitComponentKind,id:string):number{return generatedOutfitComponentTriangles(kind,id).length;}
