import type { CharacterDefinition, ColorRole, PartDefinition } from '../core/types';

const FIXED:Record<Exclude<ColorRole,'skin'|'hair'|'eyes'|'brows'|'jacket'|'accent'>,string>={shirt:'#16212b',hood:'#f3eee4',strap:'#6b4529',white:'#ffffff',mouth:'#7b3437',tongue:'#e26d78',pupil:'#12110f'};
const clamp=(n:number)=>Math.max(0,Math.min(255,n));
const shade=(hex:string,delta=0)=>{const h=hex.replace('#','');const rgb=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));return`#${rgb.map(v=>clamp(v+delta).toString(16).padStart(2,'0')).join('')}`;};
const color=(role:ColorRole,c:CharacterDefinition,delta=0)=>shade(role==='skin'?c.colors.skin:role==='hair'?c.colors.hair:role==='eyes'?c.colors.eyes:role==='brows'?c.colors.brows:role==='jacket'?c.colors.jacket:role==='accent'?c.colors.accent:FIXED[role],delta);

export function renderPartThumbnail(canvas:HTMLCanvasElement,def:PartDefinition,c:CharacterDefinition){
  const cssW=Math.max(canvas.clientWidth||64,32),cssH=Math.max(canvas.clientHeight||52,28),dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);
  const{minX,minY,maxX,maxY}=def.bounds,w=Math.max(maxX-minX,.001),h=Math.max(maxY-minY,.001),pad=5,scale=Math.min((cssW-pad*2)/w,(cssH-pad*2)/h),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  const map=([x,y]:readonly[number,number])=>({x:(x-cx)*scale+cssW/2,y:cssH/2-(y-cy)*scale});
  for(const t of[...def.triangles].sort((a,b)=>a.zIndex-b.zIndex)){const[a,b,d]=t.points.map(map);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fillStyle=color(t.colorRole,c,t.shade??0);ctx.fill();}
}
