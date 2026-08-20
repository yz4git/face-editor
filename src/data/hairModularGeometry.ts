import type { Vec2 } from '../core/types';
import type { HairBackStyleId,HairExtraStyleId } from '../core/characterExpansion';

export interface HairModularTriangle{points:readonly[Vec2,Vec2,Vec2];shade:number}
const t=(a:Vec2,b:Vec2,c:Vec2,shade=0):HairModularTriangle=>({points:[a,b,c],shade});
const q=(a:Vec2,b:Vec2,c:Vec2,d:Vec2,shade=0):HairModularTriangle[]=>[t(a,b,c,shade),t(a,c,d,shade-5)];
const ellipseFill=(cx:number,cy:number,rx:number,ry:number,segments=18,shade=0)=>{
  const out:HairModularTriangle[]=[],center:Vec2=[cx,cy];
  for(let i=0;i<segments;i++){
    const a=Math.PI*2*i/segments,b=Math.PI*2*(i+1)/segments;
    out.push(t(center,[cx+Math.cos(a)*rx,cy+Math.sin(a)*ry],[cx+Math.cos(b)*rx,cy+Math.sin(b)*ry],shade-(i%5)));
  }
  return out;
};
const ribbon=(points:readonly Vec2[],widths:readonly number[],shade=0)=>{
  const out:HairModularTriangle[]=[];
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.max(.0001,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len,wa=widths[i]??widths[widths.length-1],wb=widths[i+1]??widths[widths.length-1];
    const a1:Vec2=[a[0]+nx*wa,a[1]+ny*wa],a2:Vec2=[a[0]-nx*wa,a[1]-ny*wa],b1:Vec2=[b[0]+nx*wb,b[1]+ny*wb],b2:Vec2=[b[0]-nx*wb,b[1]-ny*wb];
    out.push(...q(a1,b1,b2,a2,shade-(i%4)*2));
  }
  return out;
};
const mirror=(items:readonly HairModularTriangle[]):HairModularTriangle[]=>items.map(item=>({shade:item.shade-5,points:item.points.map(([x,y])=>[-x,y]) as [Vec2,Vec2,Vec2]}));

const shortSide=ribbon([[.48,1.39],[.61,1.25],[.69,1.05],[.65,.83],[.56,.62],[.43,.47]], [.12,.14,.15,.14,.12,.08],-3);
const mediumSide=ribbon([[.48,1.40],[.64,1.25],[.72,1.00],[.72,.72],[.68,.43],[.62,.13],[.53,-.08],[.43,-.20]], [.12,.15,.17,.18,.18,.16,.12,.07],-3);
const longSide=ribbon([[.48,1.41],[.65,1.24],[.74,.98],[.76,.67],[.74,.34],[.70,.02],[.64,-.27],[.56,-.52],[.46,-.69]], [.12,.16,.18,.20,.20,.19,.16,.12,.07],-2);
const wavySide=[
  ...ribbon([[.48,1.40],[.64,1.28],[.72,1.09],[.66,.88],[.74,.68],[.68,.47],[.75,.26],[.67,.06],[.70,-.15],[.61,-.36],[.49,-.55]],[.12,.15,.17,.16,.17,.16,.17,.15,.13,.10,.06],-2),
  ...ribbon([[.42,1.26],[.51,1.03],[.47,.79],[.54,.57],[.49,.34],[.54,.10],[.47,-.14],[.50,-.34]],[.055,.07,.075,.07,.07,.065,.055,.035],3),
];

const BACK:Record<Exclude<HairBackStyleId,'auto'>,HairModularTriangle[]>={
  short:[...shortSide,...mirror(shortSide),...q([-.42,.55],[.42,.55],[.47,.43],[-.47,.43],-8)],
  medium:[...mediumSide,...mirror(mediumSide),...q([-.44,.34],[.44,.34],[.50,-.18],[-.50,-.18],-8)],
  long:[...longSide,...mirror(longSide),...q([-.45,.42],[.45,.42],[.54,-.67],[-.54,-.67],-7),...q([-.25,.16],[.25,.16],[.32,-.72],[-.32,-.72],-11)],
  wavy:[...wavySide,...mirror(wavySide),...q([-.42,.30],[.42,.30],[.48,-.53],[-.48,-.53],-8)],
};

const ponytail=ribbon([[.48,1.30],[.67,1.32],[.83,1.18],[.96,.96],[1.00,.69],[.94,.42],[.82,.18],[.69,-.02],[.59,-.16]],[.08,.12,.16,.18,.19,.17,.14,.10,.05],-5);
const twinRight=ribbon([[.48,1.28],[.66,1.28],[.83,1.13],[.96,.90],[.99,.63],[.92,.36],[.80,.12],[.67,-.06]],[.07,.11,.15,.17,.18,.16,.12,.06],-5);
const braid=ribbon([[.50,1.24],[.64,1.16],[.68,.96],[.60,.78],[.66,.59],[.57,.40],[.62,.20],[.53,.01],[.56,-.18],[.48,-.38]],[.07,.10,.11,.105,.10,.095,.09,.075,.06,.035],-4);

const EXTRA:Record<Exclude<HairExtraStyleId,'none'>,HairModularTriangle[]>={
  ponytail:[...ponytail,...ribbon([[.50,1.30],[.63,1.28],[.76,1.18]],[.045,.055,.04],3)],
  'twin-tail':[...twinRight,...mirror(twinRight)],
  bun:[...ellipseFill(0,1.72,.30,.23,20,-3),...ellipseFill(-.08,1.77,.16,.12,14,4),...ellipseFill(.10,1.68,.15,.11,14,-9)],
  braid:[...braid,...ribbon([[.49,1.18],[.59,.96],[.53,.77],[.58,.58],[.51,.38],[.55,.18],[.49,-.02],[.51,-.20]],[.028,.035,.032,.034,.030,.028,.024,.018],4)],
};

export function hairBackTriangles(id:HairBackStyleId):readonly HairModularTriangle[]{return id==='auto'?[]:BACK[id];}
export function hairExtraTriangles(id:HairExtraStyleId):readonly HairModularTriangle[]{return id==='none'?[]:EXTRA[id];}
