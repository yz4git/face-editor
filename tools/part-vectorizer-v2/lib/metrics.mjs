import { deltaE } from './color.mjs';

export function semanticSourceMask(raw,width,height,semanticShapes,{colorTolerance=25}={}){
  const colors=[];for(const shape of semanticShapes)if(!colors.some(c=>deltaE(c,shape.fill)<3))colors.push(shape.fill);
  const mask=new Uint8Array(width*height);if(!colors.length)return mask;
  for(let p=0,i=0;p<mask.length;p++,i+=4){if(raw[i+3]<8)continue;const rgb={r:raw[i],g:raw[i+1],b:raw[i+2]};let best=Infinity;for(const c of colors){const d=deltaE(rgb,c);if(d<best)best=d;if(best<=colorTolerance)break;}if(best<=colorTolerance)mask[p]=1;}
  return mask;
}

export function alphaMask(raw,width,height,threshold=24){const mask=new Uint8Array(width*height);for(let p=0,i=3;p<mask.length;p++,i+=4)mask[p]=raw[i]>=threshold?1:0;return mask;}
export function maskIoU(a,b){let inter=0,union=0;for(let i=0;i<a.length;i++){const A=a[i]!==0,B=b[i]!==0;if(A&&B)inter++;if(A||B)union++;}return union?inter/union:1;}

function boundary(mask,width,height){const out=new Uint8Array(mask.length);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(!mask[i])continue;if(x===0||y===0||x===width-1||y===height-1||!mask[i-1]||!mask[i+1]||!mask[i-width]||!mask[i+width])out[i]=1;}return out;}
function dilate(mask,width,height,radius){if(radius<=0)return mask;const out=new Uint8Array(mask.length);for(let y=0;y<height;y++)for(let x=0;x<width;x++){let hit=false;for(let dy=-radius;dy<=radius&&!hit;dy++)for(let dx=-radius;dx<=radius;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<width&&yy<height&&mask[yy*width+xx]){hit=true;break;}}if(hit)out[y*width+x]=1;}return out;}
export function boundaryF1(a,b,width,height,tolerance=1){const A=boundary(a,width,height),B=boundary(b,width,height),Ad=dilate(A,width,height,tolerance),Bd=dilate(B,width,height,tolerance);let aCount=0,bCount=0,aHit=0,bHit=0;for(let i=0;i<A.length;i++){if(A[i]){aCount++;if(Bd[i])aHit++;}if(B[i]){bCount++;if(Ad[i])bHit++;}}const precision=bCount?bHit/bCount:1,recall=aCount?aHit/aCount:1;return precision+recall?2*precision*recall/(precision+recall):0;}

export function foregroundColorMae(sourceRaw,candidateRaw,sourceMask,candidateMask){let total=0,count=0;for(let p=0,i=0;p<sourceMask.length;p++,i+=4){if(!sourceMask[p]||!candidateMask[p])continue;total+=Math.abs(sourceRaw[i]-candidateRaw[i])+Math.abs(sourceRaw[i+1]-candidateRaw[i+1])+Math.abs(sourceRaw[i+2]-candidateRaw[i+2]);count+=3;}return count?total/count:255;}

export function qualityScore({maskIoU,boundaryF1:edgeF1,colorMae,triangles},{maxTriangles=400}={}){
  const trianglePenalty=Math.max(0,triangles-maxTriangles)/Math.max(1,maxTriangles)*.08;return(1-maskIoU)*.50+(1-edgeF1)*.35+(colorMae/255)*.15+trianglePenalty;
}

export function passesQuality(metrics,gate={}){
  return metrics.maskIoU>=(gate.minMaskIoU??.90)&&metrics.boundaryF1>=(gate.minBoundaryF1??.80)&&metrics.colorMae<=(gate.maxColorMae??42)&&metrics.triangles<=(gate.maxTriangles??600);
}
