import type { EyeStyleId, HairStyleId, Vec2 } from '../core/types';
import { EYE_CONTOUR_SHAPES } from './generated/eyeContourShapes';
import { HAIR_PACKED_CHARS, HAIR_PACKED_FIT, HAIR_PACKED_INDEX } from './generated/hairPacked';

export type GeneratedHairRole='hair'|'hairTie';
export type GeneratedEyeRole='outline'|'white'|'eyes'|'pupil'|'highlight';
export interface GeneratedVariantTriangle<R extends string>{role:R;points:readonly [Vec2,Vec2,Vec2];shade:number}
export interface ReferenceBounds{minX:number;minY:number;maxX:number;maxY:number}

export const GENERATED_VARIATION_SOURCE={kind:'generated-reference-sheet',hairCount:10,eyeCount:10,fitRevision:8,method:'source-sheet mask segmentation + feature-preserving hair Delaunay + face-relative display calibration + source-contour eye reconstruction'} as const;

export const HAIR_REFERENCE_BOUNDS:Record<HairStyleId,ReferenceBounds>={
  ponytail:{minX:-.82,maxX:1.35,minY:-.35,maxY:2.18},
  bob:{minX:-.80,maxX:.95,minY:-.10,maxY:1.95},
  'side-tail':{minX:-.82,maxX:1.45,minY:-.65,maxY:1.95},
  'twin-tail':{minX:-1.22,maxX:1.30,minY:-.45,maxY:2.05},
  braid:{minX:-.82,maxX:1.10,minY:-.85,maxY:2.05},
  long:{minX:-.78,maxX:1.05,minY:-.65,maxY:2.00},
  wavy:{minX:-.95,maxX:1.05,minY:-.45,maxY:2.00},
  'short-spike':{minX:-.95,maxX:1.05,minY:-.05,maxY:2.25},
  bun:{minX:-.85,maxX:1.05,minY:-.15,maxY:2.25},
  'half-up':{minX:-.90,maxX:1.15,minY:-.35,maxY:2.25},
};
export const HAIR_REFERENCE_FIT=HAIR_PACKED_FIT;

export const EYE_REFERENCE_BOUNDS:Record<EyeStyleId,ReferenceBounds>={
  bright:{minX:-.180,maxX:.180,minY:-.205,maxY:.205},
  determined:{minX:-.185,maxX:.185,minY:-.165,maxY:.165},
  sharp:{minX:-.195,maxX:.195,minY:-.165,maxY:.165},
  round:{minX:-.180,maxX:.180,minY:-.190,maxY:.190},
  soft:{minX:-.190,maxX:.190,minY:-.160,maxY:.160},
  sleepy:{minX:-.205,maxX:.205,minY:-.125,maxY:.125},
  sparkle:{minX:-.190,maxX:.190,minY:-.200,maxY:.200},
  closed:{minX:-.190,maxX:.190,minY:-.055,maxY:.055},
  narrow:{minX:-.210,maxX:.210,minY:-.115,maxY:.115},
  'side-glance':{minX:-.190,maxX:.190,minY:-.150,maxY:.150},
};

const boundsOfPoints=(points:readonly Vec2[]):ReferenceBounds=>{let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const[x,y]of points){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return{minX,minY,maxX,maxY};};
const fitPoint=(p:Vec2,from:ReferenceBounds,to:ReferenceBounds):Vec2=>{const nx=(p[0]-from.minX)/Math.max(.0001,from.maxX-from.minX),ny=(p[1]-from.minY)/Math.max(.0001,from.maxY-from.minY);return[to.minX+nx*(to.maxX-to.minX),to.minY+ny*(to.maxY-to.minY)];};

const PACK_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const PACK_MAP=Object.fromEntries([...PACK_ALPHABET].map((c,i)=>[c,i])) as Record<string,number>;
function decodePackedHair(id:HairStyleId):GeneratedVariantTriangle<GeneratedHairRole>[] {
  const [triangleStart,count]=HAIR_PACKED_INDEX[id];let charIndex=triangleStart*12,buffer=0,bits=0;
  const readBits=(width:number)=>{while(bits<width){const value=PACK_MAP[HAIR_PACKED_CHARS[charIndex++]];if(value===undefined)throw new Error(`Invalid packed hair character at ${charIndex-1}`);buffer=(buffer<<6)|value;bits+=6;}bits-=width;const out=(buffer>>bits)&((1<<width)-1);buffer&=bits?(1<<bits)-1:0;return out;};
  const result:GeneratedVariantTriangle<GeneratedHairRole>[]=[];
  for(let i=0;i<count;i++){const shade=readBits(6)-32,coords:number[]=[];for(let j=0;j<6;j++)coords.push((readBits(11)-1024)/400);result.push({role:'hair',shade,points:[[coords[0],coords[1]],[coords[2],coords[3]],[coords[4],coords[5]]]});}
  return result;
}

const signedArea=(points:readonly Vec2[])=>points.reduce((sum,[x,y],i)=>{const[nx,ny]=points[(i+1)%points.length];return sum+x*ny-nx*y;},0)/2;
const cross=(a:Vec2,b:Vec2,c:Vec2)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const inTriangle=(p:Vec2,a:Vec2,b:Vec2,c:Vec2)=>{const c1=cross(a,b,p),c2=cross(b,c,p),c3=cross(c,a,p),hasNeg=c1<0||c2<0||c3<0,hasPos=c1>0||c2>0||c3>0;return!(hasNeg&&hasPos);};
function triangulatePolygon(points:readonly Vec2[]):readonly [Vec2,Vec2,Vec2][]{
  if(points.length<3)return[];if(points.length===3)return[[points[0],points[1],points[2]]];
  const indices=points.map((_,i)=>i),ccw=signedArea(points)>0,out:[Vec2,Vec2,Vec2][]=[];let guard=0;
  while(indices.length>3&&guard++<points.length*points.length){let clipped=false;
    for(let i=0;i<indices.length;i++){const ia=indices[(i-1+indices.length)%indices.length],ib=indices[i],ic=indices[(i+1)%indices.length],a=points[ia],b=points[ib],c=points[ic],turn=cross(a,b,c);if(ccw?turn<=1e-7:turn>=-1e-7)continue;
      let contains=false;for(const k of indices){if(k===ia||k===ib||k===ic)continue;if(inTriangle(points[k],a,b,c)){contains=true;break;}}if(contains)continue;out.push([a,b,c]);indices.splice(i,1);clipped=true;break;
    }
    if(!clipped)break;
  }
  if(indices.length===3)out.push([points[indices[0]],points[indices[1]],points[indices[2]]]);
  if(!out.length){const center:Vec2=[points.reduce((s,p)=>s+p[0],0)/points.length,points.reduce((s,p)=>s+p[1],0)/points.length];return points.map((p,i)=>[center,p,points[(i+1)%points.length]] as [Vec2,Vec2,Vec2]);}
  return out;
}
const polygonTriangles=(role:GeneratedEyeRole,points:readonly Vec2[],shades:readonly number[]=[0])=>triangulatePolygon(points).map((tri,i)=>({role,shade:shades[i%shades.length]??0,points:tri}));
const centroid=(points:readonly Vec2[]):Vec2=>[points.reduce((s,p)=>s+p[0],0)/Math.max(1,points.length),points.reduce((s,p)=>s+p[1],0)/Math.max(1,points.length)];
const scalePolygon=(points:readonly Vec2[],sx:number,sy:number,dy=0):Vec2[]=>{const[cx,cy]=centroid(points);return points.map(([x,y])=>[cx+(x-cx)*sx,cy+(y-cy)*sy+dy]);};
const ellipseTriangles=(cx:number,cy:number,rx:number,ry:number,segments=10):GeneratedVariantTriangle<GeneratedEyeRole>[]=>{const ring:Vec2[]=[];for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments;ring.push([cx+Math.cos(a)*rx,cy+Math.sin(a)*ry]);}return polygonTriangles('highlight',ring);};
const starTriangles=(cx:number,cy:number,r:number,inner=.34,points=4):GeneratedVariantTriangle<GeneratedEyeRole>[]=>{const ring:Vec2[]=[];for(let i=0;i<points*2;i++){const a=-Math.PI/2+i*Math.PI/points,rr=i%2===0?r:r*inner;ring.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]);}return polygonTriangles('highlight',ring);};
const WHITE_INSET:Record<EyeStyleId,readonly [number,number,number]>={bright:[.82,.78,-.006],determined:[.84,.70,-.004],sharp:[.84,.68,-.004],round:[.82,.80,-.004],soft:[.85,.72,-.003],sleepy:[.88,.60,-.006],sparkle:[.82,.80,-.004],closed:[0,0,0],narrow:[.89,.58,-.004],'side-glance':[.90,.72,-.003]};
function contourEye(id:EyeStyleId):GeneratedVariantTriangle<GeneratedEyeRole>[] {
  const shape=EYE_CONTOUR_SHAPES[id],from=boundsOfPoints(shape.outer),to=EYE_REFERENCE_BOUNDS[id],map=(points:readonly Vec2[])=>points.map(p=>fitPoint(p,from,to)),outer=map(shape.outer),iris=map(shape.iris),pupil=map(shape.pupil),out:GeneratedVariantTriangle<GeneratedEyeRole>[]=[];
  out.push(...polygonTriangles('outline',outer));
  if(id==='closed')return out;
  const [sx,sy,dy]=WHITE_INSET[id],white=scalePolygon(outer,sx,sy,dy);out.push(...polygonTriangles('white',white));
  if(iris.length)out.push(...polygonTriangles('eyes',iris,[-7,-3,2,6,1,-4]));
  if(pupil.length)out.push(...polygonTriangles('pupil',pupil));
  if(iris.length){const b=boundsOfPoints(iris),w=b.maxX-b.minX,h=b.maxY-b.minY,cx=b.minX+w*.31,cy=b.maxY-h*.20;
    if(id==='sparkle')out.push(...starTriangles(cx,cy,Math.min(w,h)*.23,.28,4),...starTriangles(b.minX+w*.70,b.minY+h*.31,Math.min(w,h)*.12,.28,4));
    else out.push(...ellipseTriangles(cx,cy,w*(id==='side-glance'?.10:.12),h*.14,10));
  }
  return out;
}

export const GENERATED_HAIR_VARIANTS=Object.fromEntries((Object.keys(HAIR_PACKED_INDEX) as HairStyleId[]).map(id=>[id,decodePackedHair(id)])) as unknown as Record<HairStyleId,readonly GeneratedVariantTriangle<GeneratedHairRole>[]>;
export const GENERATED_EYE_VARIANTS=Object.fromEntries((Object.keys(EYE_CONTOUR_SHAPES) as EyeStyleId[]).map(id=>[id,contourEye(id)])) as unknown as Record<EyeStyleId,readonly GeneratedVariantTriangle<GeneratedEyeRole>[]>;
