import type { CharacterBundle, CharacterDefinition, ColorRole, CompiledPolygonCharacter, CompiledPolygonLayer, PartDefinition, PartTransform, Vec2 } from './types';
import { BODY_PARTS, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, MOUTH_PARTS, NOSE_PARTS } from '../data/partLibrary';

type LayerDraft={id:string;zIndex:number;positions:number[];colors:number[];indices:number[]};
const clamp=(n:number)=>Math.max(0,Math.min(255,n));
const rgb=(hex:string)=>{const h=hex.replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)] as const;};
const shade=(hex:string,delta=0)=>{const[r,g,b]=rgb(hex);return`#${[r,g,b].map(v=>clamp(v+delta).toString(16).padStart(2,'0')).join('')}`;};

const baseColors:Record<Exclude<ColorRole,'skin'|'hair'|'eyes'|'brows'|'jacket'|'accent'>,string>={shirt:'#16212b',hood:'#f3eee4',strap:'#6b4529',white:'#ffffff',mouth:'#7b3437',tongue:'#e26d78',pupil:'#12110f'};
function roleColor(role:ColorRole,c:CharacterDefinition,delta=0):string{const source=role==='skin'?c.colors.skin:role==='hair'?c.colors.hair:role==='eyes'?c.colors.eyes:role==='brows'?c.colors.brows:role==='jacket'?c.colors.jacket:role==='accent'?c.colors.accent:baseColors[role];return shade(source,delta);}

class Drafts{
  private map=new Map<string,LayerDraft>();
  private layer(id:string,zIndex:number){let d=this.map.get(id);if(!d){d={id,zIndex,positions:[],colors:[],indices:[]};this.map.set(id,d);}return d;}
  tri(id:string,z:number,points:readonly Vec2[],color:string){const d=this.layer(id,z);const base=d.positions.length/3;const[r,g,b]=rgb(color);for(const[x,y]of points){d.positions.push(x,y,0);d.colors.push(r/255,g/255,b/255);}d.indices.push(base,base+1,base+2);}
  compile():CompiledPolygonLayer[]{return[...this.map.values()].sort((a,b)=>a.zIndex-b.zIndex).map(d=>({id:d.id,zIndex:d.zIndex,positions:new Float32Array(d.positions),colors:new Float32Array(d.colors),indices:new Uint16Array(d.indices)}));}
}

const apply=(p:Vec2,t:PartTransform,offset:Vec2=[0,0],mirrorX=false):Vec2=>{const px=(mirrorX?-p[0]:p[0])*t.scaleX,py=p[1]*t.scaleY,c=Math.cos(t.rotation),s=Math.sin(t.rotation);return[px*c-py*s+t.x+offset[0],px*s+py*c+t.y+offset[1]];};
function emitPart(d:Drafts,c:CharacterDefinition,def:PartDefinition,t:PartTransform={x:0,y:0,scaleX:1,scaleY:1,rotation:0},offset:Vec2=[0,0],mirrorX=false){for(const item of def.triangles)d.tri(item.layer,item.zIndex,item.points.map(p=>apply(p,t,offset,mirrorX)),roleColor(item.colorRole,c,item.shade??0));}

export function compileCharacter(c:CharacterDefinition):CompiledPolygonCharacter{
  const d=new Drafts();
  emitPart(d,c,BODY_PARTS[c.baseStyle??'female']);emitPart(d,c,HAIR_PARTS[c.hairStyle]);emitPart(d,c,FACE_PARTS[c.faceShape]);
  const eyeT=c.transforms.eyes,eyeSpacing=.31+(eyeT.spacing??0);for(const side of[-1,1]as const)emitPart(d,c,EYE_PARTS[c.eyeStyle],{...eyeT,x:0,y:0,rotation:eyeT.rotation*side},[eyeSpacing*side,.62],side<0);
  const browT=c.transforms.brows,browSpacing=.31+(browT.spacing??0);for(const side of[-1,1]as const)emitPart(d,c,BROW_PARTS[c.browStyle],{...browT,x:0,y:0,rotation:browT.rotation*side},[browSpacing*side,.93],side<0);
  emitPart(d,c,NOSE_PARTS[c.noseStyle],c.transforms.nose,[0,.41]);emitPart(d,c,MOUTH_PARTS[c.mouthStyle],c.transforms.mouth,[0,.21]);
  const layers=d.compile();let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const layer of layers)for(let i=0;i<layer.positions.length;i+=3){const x=layer.positions[i],y=layer.positions[i+1];minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return{version:1,layers,bounds:{minX,minY,maxX,maxY}};
}

export function exportCharacterBundle(definition:CharacterDefinition):CharacterBundle{const mesh=compileCharacter(definition);return{format:'face-editor-polygon-character',formatVersion:1,definition:structuredClone(definition),mesh:{version:1,bounds:mesh.bounds,layers:mesh.layers.map(l=>({id:l.id,zIndex:l.zIndex,positions:Array.from(l.positions),colors:Array.from(l.colors),indices:Array.from(l.indices)}))}};}
