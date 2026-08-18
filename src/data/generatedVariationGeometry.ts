import type { EyeStyleId, HairStyleId, Vec2 } from '../core/types';
import { EYE_RAW_A } from './generated/eyeRawA';
import { EYE_RAW_B } from './generated/eyeRawB';
import { HAIR_PACKED_BOUNDS, HAIR_PACKED_CHARS, HAIR_PACKED_FIT, HAIR_PACKED_INDEX } from './generated/hairPacked';

export type GeneratedHairRole='hair'|'hairTie';
export type GeneratedEyeRole='outline'|'white'|'eyes'|'pupil'|'highlight';
export interface GeneratedVariantTriangle<R extends string>{role:R;points:readonly [Vec2,Vec2,Vec2];shade:number}
export interface ReferenceBounds{minX:number;minY:number;maxX:number;maxY:number}

export const GENERATED_VARIATION_SOURCE={kind:'generated-reference-sheet',hairCount:10,eyeCount:10,fitRevision:5,method:'source-sheet mask segmentation + feature-preserving hair Delaunay + face-relative alignment + restored eye painter layers + source-like highlight reconstruction'} as const;
export const HAIR_REFERENCE_BOUNDS:Record<HairStyleId,ReferenceBounds>=HAIR_PACKED_BOUNDS;
export const HAIR_REFERENCE_FIT=HAIR_PACKED_FIT;

export const EYE_REFERENCE_BOUNDS:Record<EyeStyleId,ReferenceBounds>={
  bright:{minX:-.140,maxX:.140,minY:-.175,maxY:.175},determined:{minX:-.154,maxX:.154,minY:-.146,maxY:.146},sharp:{minX:-.164,maxX:.164,minY:-.148,maxY:.148},round:{minX:-.148,maxX:.148,minY:-.162,maxY:.162},soft:{minX:-.162,maxX:.162,minY:-.143,maxY:.143},sleepy:{minX:-.180,maxX:.180,minY:-.114,maxY:.114},sparkle:{minX:-.159,maxX:.159,minY:-.170,maxY:.170},closed:{minX:-.151,maxX:.151,minY:-.045,maxY:.045},narrow:{minX:-.183,maxX:.183,minY:-.106,maxY:.106},'side-glance':{minX:-.154,maxX:.154,minY:-.132,maxY:.132},
};

const PACK_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const PACK_MAP=Object.fromEntries([...PACK_ALPHABET].map((c,i)=>[c,i])) as Record<string,number>;
function decodePackedHair(id:HairStyleId):GeneratedVariantTriangle<GeneratedHairRole>[] {
  const [triangleStart,count]=HAIR_PACKED_INDEX[id];let charIndex=triangleStart*12,buffer=0,bits=0;
  const readBits=(width:number)=>{while(bits<width){const value=PACK_MAP[HAIR_PACKED_CHARS[charIndex++]];if(value===undefined)throw new Error(`Invalid packed hair character at ${charIndex-1}`);buffer=(buffer<<6)|value;bits+=6;}bits-=width;const out=(buffer>>bits)&((1<<width)-1);buffer&=bits?(1<<bits)-1:0;return out;};
  const result:GeneratedVariantTriangle<GeneratedHairRole>[]=[];
  for(let i=0;i<count;i++){const shade=readBits(6)-32,coords:number[]=[];for(let j=0;j<6;j++)coords.push((readBits(11)-1024)/400);result.push({role:'hair',shade,points:[[coords[0],coords[1]],[coords[2],coords[3]],[coords[4],coords[5]]]});}
  return result;
}

type RawSet=readonly (readonly number[])[];
const point=(raw:readonly number[],index:number):Vec2=>[raw[index],raw[index+1]];
// Role 4 from the first sheet vectorizer mixed sclera antialias islands with the true catchlight.
// Those large polygons caused the white cross/slab artifacts seen in Visual Audit. Keep the
// reliable outline/sclera/iris/pupil layers and reconstruct the actual catchlight from the
// measured iris bounds below.
const decodeEye=(raw:RawSet):GeneratedVariantTriangle<GeneratedEyeRole>[]=>raw.flatMap(values=>{const sourceRole=values[0],shade=values[1],points:[Vec2,Vec2,Vec2]=[point(values,2),point(values,4),point(values,6)];if(sourceRole===0)return[{role:'outline' as const,shade,points}];if(sourceRole===1)return[{role:'white' as const,shade,points}];if(sourceRole===2)return[{role:'eyes' as const,shade,points}];if(sourceRole===3)return[{role:'pupil' as const,shade,points}];return[];});
const bounds=(items:readonly GeneratedVariantTriangle<string>[]):ReferenceBounds=>{let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const item of items)for(const[x,y]of item.points){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return{minX,minY,maxX,maxY};};
const fit=(p:Vec2,from:ReferenceBounds,to:ReferenceBounds):Vec2=>{const nx=(p[0]-from.minX)/Math.max(from.maxX-from.minX,.0001),ny=(p[1]-from.minY)/Math.max(from.maxY-from.minY,.0001);return[to.minX+nx*(to.maxX-to.minX),to.minY+ny*(to.maxY-to.minY)];};
const ellipseTriangles=(cx:number,cy:number,rx:number,ry:number,segments=8):GeneratedVariantTriangle<GeneratedEyeRole>[]=>{const out:GeneratedVariantTriangle<GeneratedEyeRole>[]=[];for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;out.push({role:'highlight',shade:0,points:[[cx,cy],[cx+Math.cos(a)*rx,cy+Math.sin(a)*ry],[cx+Math.cos(b)*rx,cy+Math.sin(b)*ry]]});}return out;};
const starTriangles=(cx:number,cy:number,r:number,inner=.34,points=4):GeneratedVariantTriangle<GeneratedEyeRole>[]=>{const ring:Vec2[]=[];for(let i=0;i<points*2;i++){const a=-Math.PI/2+i*Math.PI/points,rr=i%2===0?r:r*inner;ring.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]);}return ring.map((p,i)=>({role:'highlight' as const,shade:0,points:[[cx,cy],p,ring[(i+1)%ring.length]] as readonly [Vec2,Vec2,Vec2]}));};
const addSourceLikeHighlights=(id:EyeStyleId,items:GeneratedVariantTriangle<GeneratedEyeRole>[])=>{
  if(id==='closed')return items;
  const iris=items.filter(item=>item.role==='eyes');if(!iris.length)return items;
  const b=bounds(iris),w=b.maxX-b.minX,h=b.maxY-b.minY,cx=b.minX+w*.31,cy=b.maxY-h*.22;
  if(id==='sparkle')return[...items,...starTriangles(cx,cy,Math.min(w,h)*.24,.30,4),...starTriangles(b.minX+w*.70,b.minY+h*.30,Math.min(w,h)*.12,.30,4)];
  const size=id==='bright'||id==='round'?1:id==='side-glance'?.86:.90;
  return[...items,...ellipseTriangles(cx,cy,w*.13*size,h*.15*size,8)];
};
const fitEyes=(id:EyeStyleId,items:GeneratedVariantTriangle<GeneratedEyeRole>[]):GeneratedVariantTriangle<GeneratedEyeRole>[]=>{const from=bounds(items),to=EYE_REFERENCE_BOUNDS[id],fitted=items.map(item=>({...item,points:item.points.map(p=>fit(p,from,to)) as unknown as readonly [Vec2,Vec2,Vec2]}));return addSourceLikeHighlights(id,fitted);};
const eyeRaw={...EYE_RAW_A,...EYE_RAW_B};

export const GENERATED_HAIR_VARIANTS=Object.fromEntries((Object.keys(HAIR_PACKED_INDEX) as HairStyleId[]).map(id=>[id,decodePackedHair(id)])) as unknown as Record<HairStyleId,readonly GeneratedVariantTriangle<GeneratedHairRole>[]>;
export const GENERATED_EYE_VARIANTS=Object.fromEntries(Object.entries(eyeRaw).map(([id,raw])=>[id,fitEyes(id as EyeStyleId,decodeEye(raw))])) as unknown as Record<EyeStyleId,readonly GeneratedVariantTriangle<GeneratedEyeRole>[]>;
