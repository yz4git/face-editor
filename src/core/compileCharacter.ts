import type { AccentStyleId, CharacterBundle, CharacterDefinition, CharacterExpressionSet, ColorRole, CompiledPolygonCharacter, CompiledPolygonLayer, ExpressionId, FaceShapeId, OutfitStyleId, PartDefinition, PartTransform, Vec2 } from './types';
import { ACCENT_PARTS, BODY_PARTS, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, HOOD_PARTS, MOUTH_PARTS, NOSE_PARTS, OUTFIT_PARTS, SHIRT_PARTS, STRAP_PARTS } from '../data/partLibrary';
import { accessoryTriangles } from '../data/accessoryPackV1Geometry';
import { hairBackTriangles,hairExtraTriangles } from '../data/hairModularGeometry';
import { autoRepairTransform } from '../data/generated/autoRepairOverrides';
import { ACCENT_PHASE2_AUTO_FIT, BROW_AUTO_FIT, EYE_AUTO_FIT, FACE_PHASE2_AUTO_FIT, HAIR_PHASE2_AUTO_FIT, HAIR_SOURCE_FIT, HOOD_PHASE2_AUTO_FIT, MOUTH_AUTO_FIT, NOSE_AUTO_FIT, OUTFIT_PHASE2_AUTO_FIT, SHIRT_PHASE2_AUTO_FIT, STRAP_PHASE2_AUTO_FIT, canonicalLayerZ, composeAxisAlignedTransforms } from './autoFit';
import { createBodyProportionMapper, createClothingProportionMapper } from './bodyProportions';
import { normalizeAccessories,normalizeClothingLayers,normalizeHairModular,shirtColor,trimColor } from './characterExpansion';
import { refineFaceShapePoint } from './faceShapeQuality';

type LayerDraft={id:string;zIndex:number;positions:number[];colors:number[];indices:number[]};
export interface CompileCharacterOptions {repairTransforms?:Readonly<Record<string,PartTransform>>}
export interface ExportCharacterOptions {activeExpression?:ExpressionId;expressionSet?:CharacterExpressionSet}
const IDENTITY:PartTransform={x:0,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0};
const CLOTHING_BODY_LAYER_IDS=new Set(['shirt','jacket-underlay','jacket','hood','strap','strap-metal','accent']);
const clamp=(n:number)=>Math.max(0,Math.min(255,n));
const rgb=(hex:string)=>{const h=hex.replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)] as const;};
const shade=(hex:string,delta=0)=>{const[r,g,b]=rgb(hex);return`#${[r,g,b].map(v=>clamp(v+delta).toString(16).padStart(2,'0')).join('')}`;};
const baseColors:Record<Exclude<ColorRole,'skin'|'hair'|'eyes'|'brows'|'jacket'|'accent'>,string>={shirt:'#16212b',hood:'#f3eee4',strap:'#6b4529',metal:'#d0ccc4',white:'#ffffff',mouth:'#7b3437',tongue:'#e26d78',pupil:'#12110f'};
function roleColor(role:ColorRole,c:CharacterDefinition,delta=0):string{const source=role==='skin'?c.colors.skin:role==='hair'?c.colors.hair:role==='eyes'?c.colors.eyes:role==='brows'?c.colors.brows:role==='jacket'?c.colors.jacket:role==='accent'?c.colors.accent:role==='shirt'?shirtColor(c):role==='hood'?trimColor(c):baseColors[role];return shade(source,delta);}
class Drafts{private map=new Map<string,LayerDraft>();private layer(id:string,zIndex:number){let d=this.map.get(id);if(!d){d={id,zIndex,positions:[],colors:[],indices:[]};this.map.set(id,d);}return d;}tri(id:string,z:number,points:readonly Vec2[],color:string){const d=this.layer(id,canonicalLayerZ(id,z)),base=d.positions.length/3,[r,g,b]=rgb(color);for(const[x,y]of points){d.positions.push(x,y,0);d.colors.push(r/255,g/255,b/255);}d.indices.push(base,base+1,base+2);}compile():CompiledPolygonLayer[]{return[...this.map.values()].sort((a,b)=>a.zIndex-b.zIndex).map(d=>({id:d.id,zIndex:d.zIndex,positions:new Float32Array(d.positions),colors:new Float32Array(d.colors),indices:new Uint16Array(d.indices)}));}}
const apply=(p:Vec2,t:PartTransform,offset:Vec2=[0,0],mirrorX=false):Vec2=>{const px=(mirrorX?-p[0]:p[0])*t.scaleX,py=p[1]*t.scaleY,c=Math.cos(t.rotation),s=Math.sin(t.rotation);return[px*c-py*s+t.x+offset[0],px*s+py*c+t.y+offset[1]];};
function emitPart(d:Drafts,c:CharacterDefinition,def:PartDefinition,t:PartTransform=IDENTITY,offset:Vec2=[0,0],mirrorX=false,preserveDirectionLayers?:ReadonlySet<string>,sourceTransform?:PartTransform){for(const item of def.triangles){const itemMirror=mirrorX&&!preserveDirectionLayers?.has(item.layer);d.tri(item.layer,item.zIndex,item.points.map(p=>apply(sourceTransform?apply(p,sourceTransform):p,t,offset,itemMirror)),roleColor(item.colorRole,c,item.shade??0));}}
const repair=(options:CompileCharacterOptions|undefined,family:string,id:string)=>{const persisted=autoRepairTransform(family,id),trial=options?.repairTransforms?.[`${family}:${id}`];if(persisted&&trial)return composeAxisAlignedTransforms(persisted,trial);return persisted??trial??IDENTITY;};
const repaired=(base:PartTransform,options:CompileCharacterOptions|undefined,family:string,id:string)=>composeAxisAlignedTransforms(base,repair(options,family,id));

const TRIANGLE_ACCENT_MAX_Y=-.28;
function emitSkinUnderlay(d:Drafts,c:CharacterDefinition){const skin=roleColor('skin',c,-3);d.tri('skin-base',0,[[-.22,.18],[.22,.18],[.25,-.42]],skin);d.tri('skin-base',0,[[-.22,.18],[.25,-.42],[-.25,-.42]],skin);}
function emitOutfitUnderlay(d:Drafts,c:CharacterDefinition,id:OutfitStyleId){
  const jacket=roleColor('jacket',c,-4);
  const torsoHem=id==='long-coat'?-2.34:id==='cropped-jacket'?-1.30:id==='bomber'?-1.58:-1.82;
  const torsoHalf=id==='long-coat'?.67:id==='tech-parka'?.60:id==='tactical-jacket'?.57:id==='bomber'?.56:id==='cropped-jacket'?.53:.52;
  d.tri('jacket-underlay',.5,[[-.43,-.43],[.43,-.43],[torsoHalf,torsoHem]],jacket);d.tri('jacket-underlay',.5,[[-.43,-.43],[torsoHalf,torsoHem],[-torsoHalf,torsoHem]],jacket);
  if(id==='vest')return;
  const shortSleeve=id==='short-sleeve',cropped=id==='cropped-jacket',bomber=id==='bomber';
  const end=shortSleeve?-1.15:cropped?-1.54:bomber?-1.58:-1.68,innerEnd=shortSleeve?-1.02:cropped?-1.42:bomber?-1.46:-1.55;
  const outer=id==='tech-parka'||id==='bomber'?-.91:-.86;
  d.tri('jacket-underlay',.5,[[-.48,-.48],[outer,-.67],[-.80,end]],jacket);d.tri('jacket-underlay',.5,[[-.48,-.48],[-.80,end],[-.52,innerEnd]],jacket);
  d.tri('jacket-underlay',.5,[[.48,-.48],[-outer,-.67],[.80,end]],jacket);d.tri('jacket-underlay',.5,[[.48,-.48],[.80,end],[.52,innerEnd]],jacket);
}
function emitAccent(d:Drafts,c:CharacterDefinition,id:AccentStyleId,options?:CompileCharacterOptions){const fit=repaired(ACCENT_PHASE2_AUTO_FIT[id],options,'accent',id);for(const item of ACCENT_PARTS[id].triangles){if(id==='triangle'&&Math.max(...item.points.map(point=>point[1]))>TRIANGLE_ACCENT_MAX_Y)continue;d.tri(item.layer,item.zIndex,item.points.map(point=>apply(point,fit)),roleColor(item.colorRole,c,item.shade??0));}}
function emitOutfit(d:Drafts,c:CharacterDefinition,options?:CompileCharacterOptions){
  const id=c.outfitStyle??'hooded',layers=normalizeClothingLayers(c.clothingLayers);
  if(layers.outer==='outfit'){
    const outfitFit=repaired(OUTFIT_PHASE2_AUTO_FIT[id],options,'outfit',id);emitOutfitUnderlay(d,c,id);
    for(const item of OUTFIT_PARTS[id].triangles)if(item.layer==='jacket')d.tri('jacket',2,item.points.map(point=>apply(point,outfitFit)),roleColor('jacket',c,item.shade??0));
  }
  const shirtId=c.shirtStyle??'tee',hoodId=c.hoodStyle??'folded',strapId=c.strapStyle??'simple';
  emitPart(d,c,SHIRT_PARTS[shirtId],repaired(SHIRT_PHASE2_AUTO_FIT[shirtId],options,'shirt',shirtId));
  if(layers.hood)emitPart(d,c,HOOD_PARTS[hoodId],repaired(HOOD_PHASE2_AUTO_FIT[hoodId],options,'hood',hoodId));
  if(layers.strap)emitPart(d,c,STRAP_PARTS[strapId],repaired(STRAP_PHASE2_AUTO_FIT[strapId],options,'strap',strapId));
  if(layers.accent)emitAccent(d,c,c.accentStyle??'diamond',options);
}
function emitFace(d:Drafts,c:CharacterDefinition,id:FaceShapeId,options?:CompileCharacterOptions){
  const fit=repaired(FACE_PHASE2_AUTO_FIT[id],options,'face',id);
  for(const item of FACE_PARTS[id].triangles)d.tri(item.layer,item.zIndex,item.points.map(point=>refineFaceShapePoint(id,apply(point,fit))),roleColor(item.colorRole,c,item.shade??0));
}
function emitModularHair(d:Drafts,c:CharacterDefinition){
  const modular=normalizeHairModular(c),color=(delta:number)=>roleColor('hair',c,delta);
  for(const item of hairBackTriangles(modular.back))d.tri('hair-back',14,item.points,color(item.shade));
  for(const item of hairExtraTriangles(modular.extra))d.tri('hair-back',14,item.points,color(item.shade));
}
function emitHairUnderCap(d:Drafts,c:CharacterDefinition){const hair=roleColor('hair',c,-8),center:Vec2=[0,1.26],ring:Vec2[]=[[-.60,1.20],[-.52,1.52],[-.26,1.68],[0,1.73],[.26,1.68],[.52,1.52],[.60,1.20]];for(let i=0;i<ring.length-1;i++)d.tri('hair-back',14,[center,ring[i],ring[i+1]],hair);}
function emitAccessories(d:Drafts,c:CharacterDefinition){
  const state=normalizeAccessories(c);
  for(const item of accessoryTriangles('faceDetail',state.faceDetail))d.tri(item.layer,item.zIndex,item.points,roleColor(item.colorRole,c,item.shade));
  for(const item of accessoryTriangles('eyewear',state.eyewear))d.tri(item.layer,item.zIndex,item.points,roleColor(item.colorRole,c,item.shade));
  for(const item of accessoryTriangles('earAccessory',state.earAccessory))d.tri(item.layer,item.zIndex,item.points,roleColor(item.colorRole,c,item.shade));
  for(const item of accessoryTriangles('headwear',state.headwear))d.tri(item.layer,item.zIndex,item.points,roleColor(item.colorRole,c,item.shade));
}

function applyCompiledBodyProportions(layers:CompiledPolygonLayer[],c:CharacterDefinition){
  const bodyMap=createBodyProportionMapper(c.bodyProportions),clothingMap=createClothingProportionMapper(c.bodyProportions);
  for(const layer of layers){
    const map=layer.id==='skin-base'?bodyMap:CLOTHING_BODY_LAYER_IDS.has(layer.id)?clothingMap:null;
    if(!map)continue;
    for(let i=0;i<layer.positions.length;i+=3){
      const [x,y]=map([layer.positions[i],layer.positions[i+1]]);
      layer.positions[i]=x;layer.positions[i+1]=y;
    }
  }
}

export function compileCharacter(c:CharacterDefinition,options?:CompileCharacterOptions):CompiledPolygonCharacter{
  const d=new Drafts();emitSkinUnderlay(d,c);emitPart(d,c,BODY_PARTS[c.baseStyle??'female']);emitOutfit(d,c,options);
  emitFace(d,c,c.faceShape,options);emitModularHair(d,c);emitHairUnderCap(d,c);
  const hairFit=repaired(composeAxisAlignedTransforms(HAIR_SOURCE_FIT[c.hairStyle],HAIR_PHASE2_AUTO_FIT[c.hairStyle]),options,'hair',c.hairStyle);emitPart(d,c,HAIR_PARTS[c.hairStyle],hairFit);
  const eyeT=c.transforms.eyes,eyeSpacing=.29+(eyeT.spacing??0),gazeLayers=c.eyeStyle==='side-glance'?new Set(['iris','pupil','eye-glint']):undefined,eyeSource=repaired(EYE_AUTO_FIT[c.eyeStyle],options,'eye',c.eyeStyle);for(const side of[-1,1]as const)emitPart(d,c,EYE_PARTS[c.eyeStyle],{...eyeT,x:0,y:0,rotation:eyeT.rotation*side},[eyeSpacing*side,.62],side<0,side<0?gazeLayers:undefined,eyeSource);
  const browT=c.transforms.brows,browSpacing=.31+(browT.spacing??0),browSource=repaired(BROW_AUTO_FIT[c.browStyle],options,'brow',c.browStyle);for(const side of[-1,1]as const)emitPart(d,c,BROW_PARTS[c.browStyle],{...browT,x:0,y:0,rotation:browT.rotation*side},[browSpacing*side,.93],side<0,undefined,browSource);
  emitPart(d,c,NOSE_PARTS[c.noseStyle],c.transforms.nose,[0,.41],false,undefined,repaired(NOSE_AUTO_FIT[c.noseStyle],options,'nose',c.noseStyle));
  emitPart(d,c,MOUTH_PARTS[c.mouthStyle],c.transforms.mouth,[0,.21],false,undefined,repaired(MOUTH_AUTO_FIT[c.mouthStyle],options,'mouth',c.mouthStyle));
  emitAccessories(d,c);
  const layers=d.compile();applyCompiledBodyProportions(layers,c);let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const layer of layers)for(let i=0;i<layer.positions.length;i+=3){const x=layer.positions[i],y=layer.positions[i+1];minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return{version:1,layers,bounds:{minX,minY,maxX,maxY}};
}
export function exportCharacterBundle(definition:CharacterDefinition,options:ExportCharacterOptions={}):CharacterBundle{const mesh=compileCharacter(definition);const bundle:CharacterBundle={format:'face-editor-polygon-character',formatVersion:1,definition:structuredClone(definition),mesh:{version:1,bounds:mesh.bounds,layers:mesh.layers.map(l=>({id:l.id,zIndex:l.zIndex,positions:Array.from(l.positions),colors:Array.from(l.colors),indices:Array.from(l.indices)}))}};if(options.expressionSet)bundle.expressions={active:options.activeExpression??options.expressionSet.defaultExpression,set:structuredClone(options.expressionSet)};return bundle;}