import { compileCharacter } from '../core/compileCharacter';
import type { CharacterDefinition } from '../core/types';

export function renderFactoryThumbnail(canvas:HTMLCanvasElement,definition:CharacterDefinition){
  const character=compileCharacter(definition),rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),width=Math.max(120,Math.round((rect.width||180)*dpr)),height=Math.max(140,Math.round((rect.height||220)*dpr));
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const{minX,maxX,minY,maxY}=character.bounds,centerX=(minX+maxX)/2,centerY=(minY+maxY)/2,spanX=Math.max(.01,maxX-minX),spanY=Math.max(.01,maxY-minY),scale=Math.min(width/(spanX*1.18),height/(spanY*1.12)),toCanvas=(x:number,y:number)=>({x:width/2+(x-centerX)*scale,y:height/2-(y-centerY)*scale});
  ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=true;ctx.lineJoin='round';ctx.lineCap='round';
  for(const layer of character.layers){const{positions,colors,indices}=layer;for(let i=0;i<indices.length;i+=3){const ia=indices[i]*3,ib=indices[i+1]*3,ic=indices[i+2]*3,p0=toCanvas(positions[ia],positions[ia+1]),p1=toCanvas(positions[ib],positions[ib+1]),p2=toCanvas(positions[ic],positions[ic+1]),r=Math.round((colors[ia]+colors[ib]+colors[ic])/3*255),g=Math.round((colors[ia+1]+colors[ib+1]+colors[ic+1])/3*255),b=Math.round((colors[ia+2]+colors[ib+2]+colors[ic+2])/3*255),fill=`rgb(${r},${g},${b})`;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();}}
}
