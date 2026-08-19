import type { AccentStyleId, CharacterBundle, CharacterDefinition, ColorRole, CompiledPolygonCharacter, CompiledPolygonLayer, HairStyleId, OutfitStyleId, PartDefinition, PartTransform, Vec2 } from './types';
import { ACCENT_PARTS, BODY_PARTS, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, HOOD_PARTS, MOUTH_PARTS, NOSE_PARTS, OUTFIT_PARTS, SHIRT_PARTS, STRAP_PARTS } from '../data/partLibrary';
import { BROW_AUTO_FIT, EYE_AUTO_FIT, MOUTH_AUTO_FIT, NOSE_AUTO_FIT, canonicalLayerZ } from './autoFit';

type LayerDraft={id:string;zIndex:number;positions:number[];colors:number[];indices:number[]};
const clamp=(n:number)=>Math.max(0,Math.min(255,n));
const rgb=(hex:string)=>{const h=hex.replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16)] as const;};
const shade=(hex:string,delta=0)=>{const[r,g,b]=rgb(hex);return`#${[r,g,b].map(v=>clamp(v+delta).toString(16).padStart(2,'0')).join('')}`;};
const baseColors:Record<Exclude<ColorRole,'skin'|'hair'|'eyes'|'brows'|'jacket'|'accent'>,string>={shirt:'#16212b',hood:'#f3eee4',strap:'#6b4529',metal:'#d0ccc4',white:'#ffffff',mouth:'#7b3437',tongue:'#e26d78',pupil:'#12110f'};
function roleColor(role:ColorRole,c:CharacterDefinition,delta=0):string{const source=role==='skin'?c.colors.skin:role==='hair'?c.colors.hair:role==='eyes'?c.colors.eyes:role==='brows'?c.colors.brows:role==='jacket'?c.colors.jacket:role==='accent'?c.colors.accent:baseColors[role];return shade(source,delta);}
class Drafts{private map=new Map<string,LayerDraft>();private layer(id:string,zIndex:number){let d=this.map.get(id);if(!d){d={id,zIndex,positions:[],colors:[],indices:[]};this.map.set(id,d);}return d;}tri(id:string,z:number,points:readonly Vec2[],color:string){const d=this.layer(id,canonicalLayerZ(id,z)),base=d.positions.length/3,[r,g,b]=rgb(color);for(const[x,y]of points){d.positions.push(x,y,0);d.colors.push(r/255,g/255,b/255);}d.indices.push(base,base+1,base+2);}compile():CompiledPolygonLayer[]{return[...this.map.values()].sort((a,b)=>a.zIndex-b.zIndex).map(d=>({id:d.id,zIndex:d.zIndex,positions:new Float32Array(d.positions),colors:new Float32Array(d.colors),indices:new Uint16Array(d.indices)}));}}
const apply=(p:Vec2,t:PartTransform,offset:Vec2=[0,0],mirrorX=false):Vec2=>{const px=(mirrorX?-p[0]:p[0])*t.scaleX,py=p[1]*t.scaleY,c=Math.cos(t.rotation),s=Math.sin(t.rotation);return[px*c-py*s+t.x+offset[0],px*s+py*c+t.y+offset[1]];};
function emitPart(d:Drafts,c:CharacterDefinition,def:PartDefinition,t:PartTransform={x:0,y:0,scaleX:1,scaleY:1,rotation:0},offset:Vec2=[0,0],mirrorX=false,preserveDirectionLayers?:ReadonlySet<string>,sourceTransform?:PartTransform){for(const item of def.triangles){const itemMirror=mirrorX&&!preserveDirectionLayers?.has(item.layer);d.tri(item.layer,item.zIndex,item.points.map(p=>apply(sourceTransform?apply(p,sourceTransform):p,t,offset,itemMirror)),roleColor(item.colorRole,c,item.shade??0));}}

// The generated hair sheet contains a blank reference head in each cell. These affine fits map
// each traced hairstyle from its own reference-head coordinates onto the canonical editor face.
const HAIR_FIT:Record<HairStyleId,PartTransform>={
  ponytail:{x:.12865,y:-.03616,scaleX:1.32327,scaleY:1.32325,rotation:0},braid:{x:.06740,y:-.02455,scaleX:.98017,scaleY:1.09094,rotation:0},bob:{x:-.23278,y:-.02590,scaleX:1.02921,scaleY:1.11777,rotation:0},'half-up':{x:-.01840,y:-.02024,scaleX:1.00470,scaleY:1.00468,rotation:0},long:{x:-.05513,y:-.02497,scaleX:1.00468,scaleY:1.10002,rotation:0},bun:{x:0,y:-.02332,scaleX:1.06594,scaleY:1.06596,rotation:0},'short-spike':{x:-.08577,y:-.00980,scaleX:.79640,scaleY:.79638,rotation:0},'side-tail':{x:-.04288,y:-.02479,scaleX:.96792,scaleY:1.09543,rotation:0},wavy:{x:-.11028,y:-.01480,scaleX:.77188,scaleY:.89608,rotation:0},'twin-tail':{x:-.01838,y:-.02592,scaleX:.98018,scaleY:1.11862,rotation:0},
};
const TRIANGLE_ACCENT_MAX_Y=-.28;
function emitSkinUnderlay(d:Drafts,c:CharacterDefinition){const skin=roleColor('skin',c,-3);d.tri('skin-base',0,[[-.22,.18],[.22,.18],[.25,-.42]],skin);d.tri('skin-base',0,[[-.22,.18],[.25,-.42],[-.25,-.42]],skin);}
function emitOutfitUnderlay(d:Drafts,c:CharacterDefinition,id:OutfitStyleId){
  const jacket=roleColor('jacket',c,-4);d.tri('jacket-underlay',.5,[[-.43,-.43],[.43,-.43],[.52,-1.82]],jacket);d.tri('jacket-underlay',.5,[[-.43,-.43],[.52,-1.82],[-.52,-1.82]],jacket);
  if(id==='vest')return;const end=id==='short-sleeve'?-1.15:-1.68,innerEnd=id==='short-sleeve'?-1.02:-1.55;
  d.tri('jacket-underlay',.5,[[-.48,-.48],[-.86,-.67],[-.80,end]],jacket);d.tri('jacket-underlay',.5,[[-.48,-.48],[-.80,end],[-.52,innerEnd]],jacket);
  d.tri('jacket-underlay',.5,[[.48,-.48],[.86,-.67],[.80,end]],jacket);d.tri('jacket-underlay',.5,[[.48,-.48],[.80,end],[.52,innerEnd]],jacket);
}
function emitAccent(d:Drafts,c:CharacterDefinition,id:AccentStyleId){for(const item of ACCENT_PARTS[id].triangles){if(id==='triangle'&&Math.max(...item.points.map(point=>point[1]))>TRIANGLE_ACCENT_MAX_Y)continue;d.tri(item.layer,item.zIndex,item.points,roleColor(item.colorRole,c,item.shade??0));}}
function emitOutfit(d:Drafts,c:CharacterDefinition){
  const id=c.outfitStyle??'hooded';emitOutfitUnderlay(d,c,id);
  // The first source-sheet row supplies the outer jacket silhouette/facets. The later rows are now
  // independently selectable, so embedded shirt/hood/accent pixels are omitted here and replaced below.
  for(const item of OUTFIT_PARTS[id].triangles)if(item.layer==='jacket')d.tri('jacket',2,item.points,roleColor('jacket',c,item.shade??0));
  emitPart(d,c,SHIRT_PARTS[c.shirtStyle??'tee']);
  emitPart(d,c,HOOD_PARTS[c.hoodStyle??'folded']);
  emitPart(d,c,STRAP_PARTS[c.strapStyle??'simple']);
  emitAccent(d,c,c.accentStyle??'diamond');
}
function emitHairUnderCap(d:Drafts,c:CharacterDefinition){const hair=roleColor('hair',c,-8),center:Vec2=[0,1.26],ring:Vec2[]=[[-.60,1.20],[-.52,1.52],[-.26,1.68],[0,1.73],[.26,1.68],[.52,1.52],[.60,1.20]];for(let i=0;i<ring.length-1;i++)d.tri('hair-back',14,[center,ring[i],ring[i+1]],hair);}

export function compileCharacter(c:CharacterDefinition):CompiledPolygonCharacter{
  const d=new Drafts();emitSkinUnderlay(d,c);emitPart(d,c,BODY_PARTS[c.baseStyle??'female']);emitOutfit(d,c);emitPart(d,c,FACE_PARTS[c.faceShape]);emitHairUnderCap(d,c);emitPart(d,c,HAIR_PARTS[c.hairStyle],HAIR_FIT[c.hairStyle]);
  const eyeT=c.transforms.eyes,eyeSpacing=.29+(eyeT.spacing??0),gazeLayers=c.eyeStyle==='side-glance'?new Set(['iris','pupil','eye-glint']):undefined;for(const side of[-1,1]as const)emitPart(d,c,EYE_PARTS[c.eyeStyle],{...eyeT,x:0,y:0,rotation:eyeT.rotation*side},[eyeSpacing*side,.62],side<0,side<0?gazeLayers:undefined,EYE_AUTO_FIT[c.eyeStyle]);
  const browT=c.transforms.brows,browSpacing=.31+(browT.spacing??0);for(const side of[-1,1]as const)emitPart(d,c,BROW_PARTS[c.browStyle],{...browT,x:0,y:0,rotation:browT.rotation*side},[browSpacing*side,.93],side<0,undefined,BROW_AUTO_FIT[c.browStyle]);
  emitPart(d,c,NOSE_PARTS[c.noseStyle],c.transforms.nose,[0,.41],false,undefined,NOSE_AUTO_FIT[c.noseStyle]);emitPart(d,c,MOUTH_PARTS[c.mouthStyle],c.transforms.mouth,[0,.21],false,undefined,MOUTH_AUTO_FIT[c.mouthStyle]);
  const layers=d.compile();let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const layer of layers)for(let i=0;i<layer.positions.length;i+=3){const x=layer.positions[i],y=layer.positions[i+1];minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return{version:1,layers,bounds:{minX,minY,maxX,maxY}};
}
export function exportCharacterBundle(definition:CharacterDefinition):CharacterBundle{const mesh=compileCharacter(definition);return{format:'face-editor-polygon-character',formatVersion:1,definition:structuredClone(definition),mesh:{version:1,bounds:mesh.bounds,layers:mesh.layers.map(l=>({id:l.id,zIndex:l.zIndex,positions:Array.from(l.positions),colors:Array.from(l.colors),indices:Array.from(l.indices)}))}};}
