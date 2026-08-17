import type { CharacterBundle, CharacterDefinition, CompiledPolygonCharacter, CompiledPolygonLayer, PartTransform, Vec2 } from './types';

type LayerDraft = { id:string; zIndex:number; positions:number[]; colors:number[]; indices:number[] };

const clamp=(n:number)=>Math.max(0,Math.min(255,n));
const rgb=(hex:string)=>{ const h=hex.replace('#',''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)] as const; };
const shade=(hex:string,delta:number)=>{ const [r,g,b]=rgb(hex); return `#${[r,g,b].map(v=>clamp(v+delta).toString(16).padStart(2,'0')).join('')}`; };
const transform=(p:Vec2,t:PartTransform):Vec2=>{ const x=p[0]*t.scaleX, y=p[1]*t.scaleY, c=Math.cos(t.rotation), s=Math.sin(t.rotation); return [x*c-y*s+t.x,x*s+y*c+t.y]; };

class Drafts {
  private map=new Map<string,LayerDraft>();
  layer(id:string,zIndex:number){ let d=this.map.get(id); if(!d){ d={id,zIndex,positions:[],colors:[],indices:[]}; this.map.set(id,d); } return d; }
  tri(id:string,z:number,a:Vec2,b:Vec2,c:Vec2,color:string,t?:PartTransform){ const d=this.layer(id,z); const pts=t?[transform(a,t),transform(b,t),transform(c,t)]:[a,b,c]; const base=d.positions.length/3; const [r,g,bl]=rgb(color); for(const p of pts){ d.positions.push(p[0],p[1],0); d.colors.push(r/255,g/255,bl/255); } d.indices.push(base,base+1,base+2); }
  quad(id:string,z:number,a:Vec2,b:Vec2,c:Vec2,d:Vec2,c1:string,c2=c1,t?:PartTransform){ this.tri(id,z,a,b,c,c1,t); this.tri(id,z,a,c,d,c2,t); }
  compile():CompiledPolygonLayer[]{ return [...this.map.values()].sort((a,b)=>a.zIndex-b.zIndex).map(d=>({ id:d.id,zIndex:d.zIndex,positions:new Float32Array(d.positions),colors:new Float32Array(d.colors),indices:new Uint16Array(d.indices) })); }
}

function torso(d:Drafts,c:CharacterDefinition){
  const blue=c.colors.jacket, dark='#16212b', white='#f3eee4', brown='#6b4529';
  d.tri('shirt',1,[-.52,-.35],[.52,-.35],[.42,-2.05],dark); d.tri('shirt',1,[-.52,-.35],[.42,-2.05],[-.42,-2.05],shade(dark,8));
  d.tri('jacket',2,[-.5,-.42],[-1.22,-.82],[-.92,-2.06],blue); d.tri('jacket',2,[-.5,-.42],[-.92,-2.06],[-.42,-1.95],shade(blue,12));
  d.tri('jacket',2,[.5,-.42],[1.22,-.82],[.92,-2.06],shade(blue,-8)); d.tri('jacket',2,[.5,-.42],[.92,-2.06],[.42,-1.95],blue);
  d.tri('hood',6,[-.56,-.42],[-.18,-.18],[-.04,-.52],white); d.tri('hood',6,[.56,-.42],[.18,-.18],[.04,-.52],shade(white,-10));
  d.quad('strap',7,[.42,-.34],[.59,-.47],[-.52,-1.98],[-.68,-1.85],brown,shade(brown,-12));
  d.quad('accent',8,[-.92,-.82],[-.82,-.86],[-.65,-1.96],[-.75,-2.01],c.colors.accent); d.quad('accent',8,[.69,-1.03],[.88,-1.16],[.78,-1.36],[.59,-1.23],c.colors.accent);
}

function hairBack(d:Drafts,c:CharacterDefinition){
  const h=c.colors.hair, a=shade(h,-16), b=shade(h,10);
  d.tri('hair-back',3,[-.64,.98],[-.85,.18],[-.5,-.05],a); d.tri('hair-back',3,[.64,.98],[.85,.18],[.5,-.05],shade(h,-8));
  if(c.hairStyle==='long'){ d.tri('hair-back',3,[-.72,.65],[-.78,-.75],[-.42,-.5],a); d.tri('hair-back',3,[.72,.65],[.78,-.75],[.42,-.5],b); }
  if(c.hairStyle==='ponytail'||c.hairStyle==='side-tail'){ const x=c.hairStyle==='side-tail'?.72:.58; d.tri('hair-back',3,[x,1.12],[1.32,1.28],[.92,.73],b); d.tri('hair-back',3,[1.32,1.28],[1.18,.44],[.92,.73],a); d.tri('hair-back',3,[1.18,.44],[.98,-.02],[.82,.55],h); }
  if(c.hairStyle==='twin-tail'){ for(const s of [-1,1]){ const x=.68*s; d.tri('hair-back',3,[x,1.02],[1.28*s,.9],[1.02*s,.34],b); d.tri('hair-back',3,[1.28*s,.9],[1.12*s,.12],[1.02*s,.34],a); } }
}

function face(d:Drafts,c:CharacterDefinition){
  const s=c.colors.skin, center:Vec2=[0,.58];
  const shape={ soft:[.68,.63,-.08], oval:[.63,.58,-.16], angular:[.7,.52,-.13], round:[.7,.68,.02] }[c.faceShape];
  const [w,jaw,chin]=shape;
  const ring:Vec2[]=[[-.48,1.33],[.48,1.33],[w,1.05],[w,.52],[jaw,.15],[0,chin],[-jaw,.15],[-w,.52],[-w,1.05]];
  const tones=[0,6,-5,4,-7,2,7,-4,3];
  for(let i=0;i<ring.length;i++) d.tri('face',5,center,ring[i],ring[(i+1)%ring.length],shade(s,tones[i]));
  d.tri('ears',5,[-w,.74],[-w-.14,.65],[-w,.43],shade(s,-4)); d.tri('ears',5,[w,.74],[w+.14,.65],[w,.43],shade(s,-7));
  d.quad('neck',4,[-.22,.02],[.22,.02],[.2,-.42],[-.2,-.42],shade(s,-5),shade(s,-10));
}

function eyes(d:Drafts,c:CharacterDefinition){
  const t=c.transforms.eyes, eye=c.colors.eyes;
  const params={ bright:[.27,.22,.01], soft:[.27,.18,0], sharp:[.29,.16,.05], round:[.24,.24,0], narrow:[.29,.12,.03] }[c.eyeStyle];
  const [w,h,tilt]=params;
  for(const side of [-1,1]){ const cx=.31*side, cy=.62; const local:PartTransform={...t,x:t.x,y:t.y,rotation:t.rotation+tilt*side};
    const L=(p:Vec2):Vec2=>[p[0]+cx,p[1]+cy];
    d.quad('eye-white',8,L([-w/2,0]),L([0,h/2]),L([w/2,0]),L([0,-h/2]),'#ffffff',shade('#ffffff',-8),local);
    const iw=w*.28, ih=h*.72; d.quad('iris',9,L([-iw/2,.01]),L([0,ih/2]),L([iw/2,.01]),L([0,-ih/2]),shade(eye,8),shade(eye,-16),local);
    d.tri('pupil',10,L([-.018,.02]),L([.018,.02]),L([0,-ih*.3]),'#12110f',local); d.tri('eye-glint',11,L([-.02,.07]),L([.035,.09]),L([-.002,.025]),'#ffffff',local);
  }
}

function brows(d:Drafts,c:CharacterDefinition){
  const t=c.transforms.brows, col=c.colors.brows; const cfg={ soft:[.28,.055,.04],straight:[.29,.045,0],angled:[.3,.06,.09],thin:[.28,.03,.02],bold:[.31,.08,.04] }[c.browStyle];
  const [w,h,ang]=cfg;
  for(const side of [-1,1]){ const cx=.31*side, cy=.93; const y2=ang*side; d.quad('brows',12,[cx-w/2,cy],[cx+w/2,cy+y2],[cx+w/2,cy+y2+h],[cx-w/2,cy+h],col,shade(col,8),t); }
}

function nose(d:Drafts,c:CharacterDefinition){ const t=c.transforms.nose,s=shade(c.colors.skin,-24); if(c.noseStyle==='line'){ d.tri('nose',12,[-.025,.47],[.02,.57],[.035,.43],s,t); return; } const size=c.noseStyle==='small'?.045:c.noseStyle==='soft'?.06:.075; d.tri('nose',12,[0,.55],[-size,.39],[size*.25,.42],s,t); d.tri('nose',12,[0,.55],[size*.25,.42],[size,.44],shade(s,8),t); }

function mouth(d:Drafts,c:CharacterDefinition){ const t=c.transforms.mouth, y=.22; if(c.mouthStyle==='neutral'){ d.quad('mouth',13,[-.16,y],[.16,y],[.16,y-.018],[-.16,y-.018],'#522a28',undefined,t); return; } if(c.mouthStyle==='o'){ d.quad('mouth',13,[-.07,y+.06],[.07,y+.06],[.07,y-.08],[-.07,y-.08],'#7e3438','#b95259',t); return; } const open=c.mouthStyle==='smile-open', w=c.mouthStyle==='soft-smile'?.16:.24; if(open){ d.tri('mouth',13,[-w,y+.03],[w,y+.03],[0,y-.18],'#7b3437',t); d.tri('mouth',14,[-w*.55,y-.07],[w*.55,y-.07],[0,y-.16],'#e26d78',t); } else { d.tri('mouth',13,[-w,y],[0,y-.07],[w,y], '#6d3535',t); } }

function hairFront(d:Drafts,c:CharacterDefinition){ const h=c.colors.hair, d1=shade(h,-15), l=shade(h,12); const tris:[Vec2,Vec2,Vec2,string][]=[
  [[-.72,1.08],[-.34,1.58],[-.18,.94],h], [[-.34,1.58],[.08,1.7],[-.18,.94],l], [[.08,1.7],[.49,1.48],[.13,.9],h], [[.49,1.48],[.72,1.04],[.13,.9],d1],
  [[-.72,1.08],[-.93,.93],[-.58,.62],d1], [[.72,1.04],[.9,.88],[.6,.54],h], [[-.18,.94],[.03,1.22],[.13,.9],d1], [[-.58,.62],[-.32,.97],[-.24,.45],h],
]; for(const [a,b,c2,col] of tris)d.tri('hair-front',15,a,b,c2,col);
  if(c.hairStyle==='bob') d.tri('hair-front',15,[.61,.78],[.7,.08],[.42,.27],d1);
  if(c.hairStyle==='short-spike') d.tri('hair-front',15,[.38,1.48],[.76,1.32],[.55,1.05],l);
}

export function compileCharacter(c:CharacterDefinition):CompiledPolygonCharacter{
  const d=new Drafts(); torso(d,c); hairBack(d,c); face(d,c); eyes(d,c); brows(d,c); nose(d,c); mouth(d,c); hairFront(d,c); const layers=d.compile();
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity; for(const layer of layers){ for(let i=0;i<layer.positions.length;i+=3){ const x=layer.positions[i],y=layer.positions[i+1]; minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y); } }
  return { version:1,layers,bounds:{minX,minY,maxX,maxY} };
}

export function exportCharacterBundle(definition:CharacterDefinition):CharacterBundle{ const mesh=compileCharacter(definition); return { format:'face-editor-polygon-character',formatVersion:1,definition:structuredClone(definition),mesh:{version:1,bounds:mesh.bounds,layers:mesh.layers.map(l=>({id:l.id,zIndex:l.zIndex,positions:Array.from(l.positions),colors:Array.from(l.colors),indices:Array.from(l.indices)}))} }; }
