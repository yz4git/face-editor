import type { CharacterBundle, CharacterDefinition, ColorRole, CompiledPolygonCharacter, CompiledPolygonLayer, PartDefinition, PartTransform, Vec2 } from './types';
import { ACCENT_PARTS, BODY_PARTS, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, HOOD_PARTS, MOUTH_PARTS, NOSE_PARTS, OUTFIT_PARTS, SHIRT_PARTS, STRAP_PARTS } from '../data/partLibrary';
import {
  autoFitFace,autoFitFeature,autoFitHair,autoFitJacket,autoFitOutfitComponent,boundsForPart,composeFit,fitEntry,
  resolvedLayerZ,transformBounds,type AutoFitReport,type FitBounds,
} from './partAutoFit';

type LayerDraft={id:string;zIndex:number;positions:number[];colors:number[];indices:number[]};
type FitPlan={
  face:PartTransform;faceBounds:FitBounds;hair:PartTransform;hairScore:number;jacket:PartTransform;
  shirt:PartTransform;hood:PartTransform;strap:PartTransform;accent:PartTransform;
  eyes:Record<-1|1,PartTransform>;brows:Record<-1|1,PartTransform>;nose:PartTransform;mouth:PartTransform;
};

const clamp=(n:number)=>Math.max(0,Math.min(255,n));
const rgb=(hex:string)=>{const h=hex.replace('#','');return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)] as const;};
const shade=(hex:string,delta=0)=>{const[r,g,b]=rgb(hex);return`#${[r,g,b].map(v=>clamp(v+delta).toString(16).padStart(2,'0')).join('')}`;};
const baseColors:Record<Exclude<ColorRole,'skin'|'hair'|'eyes'|'brows'|'jacket'|'accent'>,string>={shirt:'#16212b',hood:'#f3eee4',strap:'#6b4529',metal:'#d0ccc4',white:'#ffffff',mouth:'#7b3437',tongue:'#e26d78',pupil:'#12110f'};
function roleColor(role:ColorRole,c:CharacterDefinition,delta=0):string{const source=role==='skin'?c.colors.skin:role==='hair'?c.colors.hair:role==='eyes'?c.colors.eyes:role==='brows'?c.colors.brows:role==='jacket'?c.colors.jacket:role==='accent'?c.colors.accent:baseColors[role];return shade(source,delta);}

class Drafts{
  private map=new Map<string,LayerDraft>();
  private layer(id:string,zIndex:number){let d=this.map.get(id);if(!d){d={id,zIndex,positions:[],colors:[],indices:[]};this.map.set(id,d);}else d.zIndex=Math.max(d.zIndex,zIndex);return d;}
  tri(id:string,z:number,points:readonly Vec2[],color:string){const d=this.layer(id,z),base=d.positions.length/3,[r,g,b]=rgb(color);for(const[x,y]of points){d.positions.push(x,y,0);d.colors.push(r/255,g/255,b/255);}d.indices.push(base,base+1,base+2);}
  compile():CompiledPolygonLayer[]{return[...this.map.values()].sort((a,b)=>a.zIndex-b.zIndex||a.id.localeCompare(b.id)).map(d=>({id:d.id,zIndex:d.zIndex,positions:new Float32Array(d.positions),colors:new Float32Array(d.colors),indices:new Uint16Array(d.indices)}));}
}

const apply=(p:Vec2,t:PartTransform,mirrorX=false):Vec2=>{const px=(mirrorX?-p[0]:p[0])*t.scaleX,py=p[1]*t.scaleY,c=Math.cos(t.rotation),s=Math.sin(t.rotation);return[px*c-py*s+t.x,px*s+py*c+t.y];};
function emitPart(d:Drafts,c:CharacterDefinition,def:PartDefinition,t:PartTransform={x:0,y:0,scaleX:1,scaleY:1,rotation:0},mirrorX=false,preserveDirectionLayers?:ReadonlySet<string>,predicate?:(layer:string)=>boolean){
  for(const item of def.triangles){if(predicate&&!predicate(item.layer))continue;const itemMirror=mirrorX&&!preserveDirectionLayers?.has(item.layer);d.tri(item.layer,resolvedLayerZ(item.layer,item.zIndex),item.points.map(p=>apply(p,t,itemMirror)),roleColor(item.colorRole,c,item.shade??0));}
}

const CANONICAL_FACE:FitBounds={...FACE_PARTS.soft.bounds};
const CANONICAL_JACKET:FitBounds=boundsForPart(OUTFIT_PARTS.hooded,layer=>layer==='jacket');

function createFitPlan(c:CharacterDefinition):FitPlan{
  const faceDef=FACE_PARTS[c.faceShape],face=autoFitFace(faceDef,CANONICAL_FACE),faceBounds=transformBounds(faceDef.bounds,face);
  const hairResult=autoFitHair(c.hairStyle,HAIR_PARTS[c.hairStyle],faceBounds);
  const jacket=autoFitJacket(OUTFIT_PARTS[c.outfitStyle??'hooded'],CANONICAL_JACKET);
  const shirt=autoFitOutfitComponent('shirt',c.shirtStyle??'tee',SHIRT_PARTS[c.shirtStyle??'tee'],CANONICAL_JACKET);
  const hood=autoFitOutfitComponent('hood',c.hoodStyle??'folded',HOOD_PARTS[c.hoodStyle??'folded'],CANONICAL_JACKET);
  const strap=autoFitOutfitComponent('strap',c.strapStyle??'simple',STRAP_PARTS[c.strapStyle??'simple'],CANONICAL_JACKET);
  const accent=autoFitOutfitComponent('accent',c.accentStyle??'diamond',ACCENT_PARTS[c.accentStyle??'diamond'],CANONICAL_JACKET);
  const eyeUser=c.transforms.eyes,browUser=c.transforms.brows;
  const eyes={} as Record<-1|1,PartTransform>,brows={} as Record<-1|1,PartTransform>;
  for(const side of[-1,1]as const){
    const eyeBase=autoFitFeature(EYE_PARTS[c.eyeStyle],faceBounds,'eye',side),browBase=autoFitFeature(BROW_PARTS[c.browStyle],faceBounds,'brow',side);
    eyes[side]=composeFit(eyeBase,{...eyeUser,x:eyeUser.x+side*(eyeUser.spacing??0),rotation:eyeUser.rotation*side});
    brows[side]=composeFit(browBase,{...browUser,x:browUser.x+side*(browUser.spacing??0),rotation:browUser.rotation*side});
  }
  return{
    face,faceBounds,hair:hairResult.transform,hairScore:hairResult.score,jacket,shirt,hood,strap,accent,eyes,brows,
    nose:composeFit(autoFitFeature(NOSE_PARTS[c.noseStyle],faceBounds,'nose'),c.transforms.nose),
    mouth:composeFit(autoFitFeature(MOUTH_PARTS[c.mouthStyle],faceBounds,'mouth'),c.transforms.mouth),
  };
}

function emitSkinUnderlay(d:Drafts,c:CharacterDefinition,face:FitBounds){
  const skin=roleColor('skin',c,-3),cx=(face.minX+face.maxX)/2,w=face.maxX-face.minX,h=face.maxY-face.minY,top=face.minY+h*.10,bottom=top-h*.42,half=w*.18;
  d.tri('skin-base',resolvedLayerZ('skin-base',0),[[cx-half,top],[cx+half,top],[cx+half*.82,bottom]],skin);d.tri('skin-base',resolvedLayerZ('skin-base',0),[[cx-half,top],[cx+half*.82,bottom],[cx-half*.82,bottom]],skin);
}
function emitOutfitUnderlay(d:Drafts,c:CharacterDefinition){
  const b=CANONICAL_JACKET,cx=(b.minX+b.maxX)/2,w=b.maxX-b.minX,h=b.maxY-b.minY,jacket=roleColor('jacket',c,-6),top=b.maxY-h*.08,bottom=b.minY+h*.03;
  d.tri('jacket-underlay',resolvedLayerZ('jacket-underlay',.5),[[cx-w*.28,top],[cx+w*.28,top],[cx+w*.34,bottom]],jacket);d.tri('jacket-underlay',resolvedLayerZ('jacket-underlay',.5),[[cx-w*.28,top],[cx+w*.34,bottom],[cx-w*.34,bottom]],jacket);
}
function emitHairUnderCap(d:Drafts,c:CharacterDefinition,face:FitBounds){
  const hair=roleColor('hair',c,-10),cx=(face.minX+face.maxX)/2,w=face.maxX-face.minX,h=face.maxY-face.minY,center:Vec2=[cx,face.maxY-h*.05],ring:Vec2[]=[
    [cx-w*.55,face.maxY-h*.10],[cx-w*.43,face.maxY+h*.13],[cx-w*.22,face.maxY+h*.20],[cx,face.maxY+h*.23],[cx+w*.22,face.maxY+h*.20],[cx+w*.43,face.maxY+h*.13],[cx+w*.55,face.maxY-h*.10],
  ];
  for(let i=0;i<ring.length-1;i++)d.tri('hair-back',resolvedLayerZ('hair-back',14),[center,ring[i],ring[i+1]],hair);
}

export function getCharacterAutoFitReport(c:CharacterDefinition):AutoFitReport{
  const plan=createFitPlan(c),entries=[
    fitEntry(c.faceShape,'face',FACE_PARTS[c.faceShape],CANONICAL_FACE,plan.face),
    fitEntry(c.hairStyle,'hair',HAIR_PARTS[c.hairStyle],plan.faceBounds,plan.hair,plan.hairScore),
    fitEntry(c.outfitStyle,'jacket',OUTFIT_PARTS[c.outfitStyle],CANONICAL_JACKET,plan.jacket),
    fitEntry(c.shirtStyle,'shirt',SHIRT_PARTS[c.shirtStyle],CANONICAL_JACKET,plan.shirt),
    fitEntry(c.hoodStyle,'hood',HOOD_PARTS[c.hoodStyle],CANONICAL_JACKET,plan.hood),
    fitEntry(c.strapStyle,'strap',STRAP_PARTS[c.strapStyle],CANONICAL_JACKET,plan.strap),
    fitEntry(c.accentStyle,'accent',ACCENT_PARTS[c.accentStyle],CANONICAL_JACKET,plan.accent),
    fitEntry(`${c.eyeStyle}:left`,'eye',EYE_PARTS[c.eyeStyle],plan.faceBounds,plan.eyes[-1]),fitEntry(`${c.eyeStyle}:right`,'eye',EYE_PARTS[c.eyeStyle],plan.faceBounds,plan.eyes[1]),
    fitEntry(`${c.browStyle}:left`,'brow',BROW_PARTS[c.browStyle],plan.faceBounds,plan.brows[-1]),fitEntry(`${c.browStyle}:right`,'brow',BROW_PARTS[c.browStyle],plan.faceBounds,plan.brows[1]),
    fitEntry(c.noseStyle,'nose',NOSE_PARTS[c.noseStyle],plan.faceBounds,plan.nose),fitEntry(c.mouthStyle,'mouth',MOUTH_PARTS[c.mouthStyle],plan.faceBounds,plan.mouth),
  ];
  return{version:2,entries};
}

export function compileCharacter(c:CharacterDefinition):CompiledPolygonCharacter{
  const d=new Drafts(),plan=createFitPlan(c);emitSkinUnderlay(d,c,plan.faceBounds);emitPart(d,c,BODY_PARTS[c.baseStyle??'female']);emitOutfitUnderlay(d,c);
  emitPart(d,c,OUTFIT_PARTS[c.outfitStyle??'hooded'],plan.jacket,false,undefined,layer=>layer==='jacket');
  emitPart(d,c,SHIRT_PARTS[c.shirtStyle??'tee'],plan.shirt);emitPart(d,c,HOOD_PARTS[c.hoodStyle??'folded'],plan.hood);emitPart(d,c,STRAP_PARTS[c.strapStyle??'simple'],plan.strap);emitPart(d,c,ACCENT_PARTS[c.accentStyle??'diamond'],plan.accent);
  emitHairUnderCap(d,c,plan.faceBounds);emitPart(d,c,FACE_PARTS[c.faceShape],plan.face);emitPart(d,c,HAIR_PARTS[c.hairStyle],plan.hair);
  const gazeLayers=c.eyeStyle==='side-glance'?new Set(['iris','pupil','eye-glint']):undefined;for(const side of[-1,1]as const)emitPart(d,c,EYE_PARTS[c.eyeStyle],plan.eyes[side],side<0,side<0?gazeLayers:undefined);
  for(const side of[-1,1]as const)emitPart(d,c,BROW_PARTS[c.browStyle],plan.brows[side],side<0);
  emitPart(d,c,NOSE_PARTS[c.noseStyle],plan.nose);emitPart(d,c,MOUTH_PARTS[c.mouthStyle],plan.mouth);
  const layers=d.compile();let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const layer of layers)for(let i=0;i<layer.positions.length;i+=3){const x=layer.positions[i],y=layer.positions[i+1];minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return{version:1,layers,bounds:{minX,minY,maxX,maxY}};
}

export function exportCharacterBundle(definition:CharacterDefinition):CharacterBundle{const mesh=compileCharacter(definition);return{format:'face-editor-polygon-character',formatVersion:1,definition:structuredClone(definition),mesh:{version:1,bounds:mesh.bounds,layers:mesh.layers.map(l=>({id:l.id,zIndex:l.zIndex,positions:Array.from(l.positions),colors:Array.from(l.colors),indices:Array.from(l.indices)}))}};}
