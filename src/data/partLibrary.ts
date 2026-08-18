import type {
  BrowStyleId, CharacterBaseId, ColorRole, EyeStyleId, FaceShapeId, HairStyleId,
  MouthStyleId, NoseStyleId, PartCategory, PartDefinition, PartTriangleDefinition, Vec2,
} from '../core/types';
import {
  REFERENCE_FACE_OUTLINE, REFERENCE_FACE_SHADES, REFERENCE_SMALL_NOSE,
  REFERENCE_SMILE_OPEN_INNER, REFERENCE_SMILE_OPEN_OUTER, REFERENCE_SOFT_BROW,
} from './referenceFaceGeometry';
import {
  REFERENCE_FEMALE_ACCENT, REFERENCE_FEMALE_HOOD, REFERENCE_FEMALE_JACKET,
  REFERENCE_FEMALE_SHIRT, REFERENCE_FEMALE_STRAP,
} from './referenceBodyGeometry';
import { GENERATED_EYE_VARIANTS, GENERATED_HAIR_VARIANTS } from './generatedVariationGeometry';

type TriSpec = Omit<PartTriangleDefinition,'points'> & { points: readonly [Vec2,Vec2,Vec2] };
type ReferenceTri={points:readonly [Vec2,Vec2,Vec2];shade:number};
const tri=(layer:string,zIndex:number,colorRole:ColorRole,a:Vec2,b:Vec2,c:Vec2,shade=0):TriSpec=>({layer,zIndex,colorRole,shade,points:[a,b,c]});
const quad=(layer:string,zIndex:number,colorRole:ColorRole,a:Vec2,b:Vec2,c:Vec2,d:Vec2,shadeA=0,shadeB=shadeA):TriSpec[]=>[
  tri(layer,zIndex,colorRole,a,b,c,shadeA),tri(layer,zIndex,colorRole,a,c,d,shadeB),
];
const fan=(layer:string,zIndex:number,colorRole:ColorRole,points:readonly Vec2[],shades:readonly number[]=[0]):TriSpec[]=>{
  const center:Vec2=[points.reduce((sum,p)=>sum+p[0],0)/points.length,points.reduce((sum,p)=>sum+p[1],0)/points.length];
  return points.map((p,i)=>tri(layer,zIndex,colorRole,center,p,points[(i+1)%points.length],shades[i%shades.length]??0));
};
const referenceTris=(items:readonly ReferenceTri[],layer:string,zIndex:number,colorRole:ColorRole):TriSpec[]=>
  items.map(({points,shade})=>tri(layer,zIndex,colorRole,points[0],points[1],points[2],shade));
const boundsOf=(items:readonly TriSpec[])=>{
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const item of items) for(const [x,y] of item.points){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  return {minX,minY,maxX,maxY};
};
const part=<T extends string>(id:T,label:string,category:PartCategory,triangles:readonly TriSpec[],tags:string[]=[]):PartDefinition<T>=>({id,label,category,anchor:[0,0],bounds:boundsOf(triangles),tags,triangles});

function proceduralBody(base:CharacterBaseId):PartDefinition<CharacterBaseId>{
  const shoulder=base==='female'?1.15:1.27,waist=base==='female'?.78:.9;
  const jacket:TriSpec[]=[
    tri('shirt',1,'shirt',[-.48,-.38],[.48,-.38],[.39,-2.02],0),tri('shirt',1,'shirt',[-.48,-.38],[.39,-2.02],[-.39,-2.02],8),
    tri('jacket',2,'jacket',[-.48,-.43],[-shoulder,-.82],[-waist,-2.05],0),tri('jacket',2,'jacket',[-.48,-.43],[-waist,-2.05],[-.40,-1.92],11),
    tri('jacket',2,'jacket',[.48,-.43],[shoulder,-.82],[waist,-2.05],-8),tri('jacket',2,'jacket',[.48,-.43],[waist,-2.05],[.40,-1.92],2),
    ...quad('hood',6,'hood',[-.58,-.44],[-.18,-.18],[-.04,-.53],[-.36,-.68],0,-7),...quad('hood',6,'hood',[.58,-.44],[.18,-.18],[.04,-.53],[.36,-.68],-8,-3),
    ...quad('strap',7,'strap',[.42,-.34],[.59,-.47],[-.52,-1.98],[-.68,-1.85],0,-12),...quad('accent',8,'accent',[-.91,-.83],[-.82,-.87],[-.65,-1.96],[-.75,-2.01]),...quad('accent',8,'accent',[.70,-1.03],[.89,-1.16],[.79,-1.37],[.60,-1.24]),
  ];
  return part(base,base==='female'?'Female base':'Male base','body',jacket,[base,'base']);
}
function referenceFemaleBody():PartDefinition<CharacterBaseId>{
  const geometry:TriSpec[]=[
    ...referenceTris(REFERENCE_FEMALE_SHIRT,'shirt',1,'shirt'),
    ...referenceTris(REFERENCE_FEMALE_JACKET,'jacket',2,'jacket'),
    ...referenceTris(REFERENCE_FEMALE_HOOD,'hood',6,'hood'),
    ...referenceTris(REFERENCE_FEMALE_STRAP,'strap',7,'strap'),
    ...referenceTris(REFERENCE_FEMALE_ACCENT,'accent',8,'accent'),
  ];
  return part('female','Female base','body',geometry,['female','base','reference-fit']);
}

function facePart(id:FaceShapeId,label:string,w:number,jaw:number,chin:number):PartDefinition<FaceShapeId>{
  const center:Vec2=[0,.58],ring:Vec2[]=[[-.48,1.33],[.48,1.33],[w,1.05],[w,.52],[jaw,.15],[0,chin],[-jaw,.15],[-w,.52],[-w,1.05]],tones=[0,3,-3,2,-4,1,4,-2,2];
  const ts:TriSpec[]=[];for(let i=0;i<ring.length;i++)ts.push(tri('face',5,'skin',center,ring[i],ring[(i+1)%ring.length],tones[i]));
  ts.push(tri('ears',5,'skin',[-w,.74],[-w-.14,.65],[-w,.43],-4),tri('ears',5,'skin',[w,.74],[w+.14,.65],[w,.43],-7),...quad('neck',4,'skin',[-.22,.02],[.22,.02],[.2,-.42],[-.2,-.42],-5,-10));
  return part(id,label,'face',ts,['face']);
}
function referenceSoftFacePart():PartDefinition<FaceShapeId>{
  const center:Vec2=[0,.58],ts:TriSpec[]=[];
  const border:Vec2[]=REFERENCE_FACE_OUTLINE.map(([x,y])=>[x*1.028,.58+(y-.58)*1.028]);
  ts.push(...fan('face-outline',4,'pupil',border,[0]));
  for(let i=0;i<REFERENCE_FACE_OUTLINE.length;i++)ts.push(tri('face',5,'skin',center,REFERENCE_FACE_OUTLINE[i],REFERENCE_FACE_OUTLINE[(i+1)%REFERENCE_FACE_OUTLINE.length],REFERENCE_FACE_SHADES[i]??0));
  const earOuter:Vec2[]=[[.46,.88],[.68,.79],[.70,.58],[.61,.39],[.53,.34]];
  const earInner:Vec2[]=[[.49,.83],[.63,.75],[.64,.59],[.58,.44],[.53,.40]];
  ts.push(...fan('ear-outline',4,'pupil',earOuter,[0]),...fan('ears',5,'skin',earInner,[-2,-4,-7,-5,-2]));
  ts.push(...quad('neck-outline',3,'pupil',[-.20,.08],[.20,.06],[.25,-.39],[-.27,-.45]),...quad('neck',4,'skin',[-.16,.06],[.16,.04],[.20,-.35],[-.23,-.40],-5,-10));
  return part('soft','Soft','face',ts,['face','reference-fit','outlined']);
}

const hairLabels:Record<HairStyleId,string>={
  ponytail:'High ponytail',bob:'Short bob','side-tail':'Side ponytail','twin-tail':'Twin tails',braid:'Side braid',long:'Long straight',wavy:'Medium wavy','short-spike':'Short spiky',bun:'High bun','half-up':'Half up',
};
function generatedHairPart(id:HairStyleId):PartDefinition<HairStyleId>{
  const source=GENERATED_HAIR_VARIANTS[id];
  const geometry:TriSpec[]=source.map(({role,points,shade})=>tri(role==='hairTie'?'hair-tie':'hair-front',role==='hairTie'?16:15,role==='hairTie'?'mouth':'hair',points[0],points[1],points[2],shade));
  return part(id,hairLabels[id],'hair',geometry,[id,'hair','variation-sheet','reference-fit']);
}

const eyeLabels:Record<EyeStyleId,string>={
  bright:'Bright',determined:'Determined',sharp:'Sharp',round:'Cheerful round',soft:'Gentle',sleepy:'Sleepy',sparkle:'Sparkling',closed:'Closed smile',narrow:'Cool narrow','side-glance':'Side glance',
};
function generatedEyePart(id:EyeStyleId):PartDefinition<EyeStyleId>{
  const source=GENERATED_EYE_VARIANTS[id];
  const geometry:TriSpec[]=source.map(({role,points,shade})=>{
    if(role==='white')return tri('eye-white',9,'white',points[0],points[1],points[2],shade);
    if(role==='eyes')return tri('iris',10,'eyes',points[0],points[1],points[2],shade);
    return tri('pupil',11,'pupil',points[0],points[1],points[2],shade);
  });
  return part(id,eyeLabels[id],'eye',geometry,[id,'eye','variation-sheet','reference-fit']);
}

function browPart(id:BrowStyleId,label:string,w:number,h:number,angle=0):PartDefinition<BrowStyleId>{return part(id,label,'brow',[...quad('brows',12,'brows',[-w/2,0],[w/2,angle],[w/2,angle+h],[-w/2,h],0,8)],['brow']);}
function referenceSoftBrowPart():PartDefinition<BrowStyleId>{
  const points:Vec2[]=REFERENCE_SOFT_BROW.map(([x,y])=>[x*1.16,y*1.12]);
  return part('soft','Soft','brow',fan('brows',12,'brows',points,[0,2,4,2,0,-2,0,1]),['brow','reference-fit']);
}
function nosePart(id:NoseStyleId,label:string):PartDefinition<NoseStyleId>{if(id==='line')return part(id,label,'nose',[tri('nose',12,'skin',[-.025,.06],[.02,.16],[.035,.02],-24)],['nose']);const size=id==='small'?.045:id==='soft'?.06:.075;return part(id,label,'nose',[tri('nose',12,'skin',[0,.14],[-size,-.02],[size*.25,.01],-24),tri('nose',12,'skin',[0,.14],[size*.25,.01],[size,.03],-16)],['nose']);}
function referenceNosePart():PartDefinition<NoseStyleId>{return part('diamond','Diamond','nose',fan('nose',12,'skin',REFERENCE_SMALL_NOSE,[-22,-18,-24,-16,-20]),['nose','reference-fit']);}
function mouthPart(id:MouthStyleId,label:string):PartDefinition<MouthStyleId>{if(id==='neutral')return part(id,label,'mouth',[...quad('mouth',13,'mouth',[-.16,.01],[.16,.01],[.16,-.008],[-.16,-.008])],['mouth']);if(id==='o')return part(id,label,'mouth',[...quad('mouth',13,'mouth',[-.07,.07],[.07,.07],[.07,-.07],[-.07,-.07],0,10)],['mouth']);const w=id==='soft-smile'?.16:.24;return part(id,label,'mouth',[tri('mouth',13,'mouth',[-w,.01],[0,-.06],[w,.01])],['mouth']);}
function referenceSmileOpenPart():PartDefinition<MouthStyleId>{return part('smile-open','Open smile','mouth',[...fan('mouth',13,'mouth',REFERENCE_SMILE_OPEN_OUTER,[0,-4,-8,-5,0,3,0,-3]),...fan('mouth-detail',14,'tongue',REFERENCE_SMILE_OPEN_INNER,[0,4,8,5,2,0,-2])],['mouth','reference-fit']);}

export const BODY_PARTS:Record<CharacterBaseId,PartDefinition<CharacterBaseId>>={female:referenceFemaleBody(),male:proceduralBody('male')};
export const FACE_PARTS:Record<FaceShapeId,PartDefinition<FaceShapeId>>={soft:referenceSoftFacePart(),oval:facePart('oval','Oval',.63,.58,-.16),angular:facePart('angular','Angular',.70,.52,-.13),round:facePart('round','Round',.70,.68,.02)};
export const HAIR_PARTS:Record<HairStyleId,PartDefinition<HairStyleId>>={
  ponytail:generatedHairPart('ponytail'),bob:generatedHairPart('bob'),'side-tail':generatedHairPart('side-tail'),'twin-tail':generatedHairPart('twin-tail'),braid:generatedHairPart('braid'),long:generatedHairPart('long'),wavy:generatedHairPart('wavy'),'short-spike':generatedHairPart('short-spike'),bun:generatedHairPart('bun'),'half-up':generatedHairPart('half-up'),
};
export const EYE_PARTS:Record<EyeStyleId,PartDefinition<EyeStyleId>>={
  bright:generatedEyePart('bright'),determined:generatedEyePart('determined'),sharp:generatedEyePart('sharp'),round:generatedEyePart('round'),soft:generatedEyePart('soft'),sleepy:generatedEyePart('sleepy'),sparkle:generatedEyePart('sparkle'),closed:generatedEyePart('closed'),narrow:generatedEyePart('narrow'),'side-glance':generatedEyePart('side-glance'),
};
export const BROW_PARTS:Record<BrowStyleId,PartDefinition<BrowStyleId>>={soft:referenceSoftBrowPart(),straight:browPart('straight','Straight',.29,.045,0),angled:browPart('angled','Angled',.30,.06,.09),thin:browPart('thin','Thin',.28,.03,.02),bold:browPart('bold','Bold',.31,.08,.04)};
export const NOSE_PARTS:Record<NoseStyleId,PartDefinition<NoseStyleId>>={diamond:referenceNosePart(),small:nosePart('small','Small'),line:nosePart('line','Line'),soft:nosePart('soft','Soft')};
export const MOUTH_PARTS:Record<MouthStyleId,PartDefinition<MouthStyleId>>={'smile-open':referenceSmileOpenPart(),smile:mouthPart('smile','Smile'),neutral:mouthPart('neutral','Neutral'),'soft-smile':mouthPart('soft-smile','Soft smile'),o:mouthPart('o','O')};
export const PART_LIBRARY={body:BODY_PARTS,hair:HAIR_PARTS,face:FACE_PARTS,eye:EYE_PARTS,brow:BROW_PARTS,nose:NOSE_PARTS,mouth:MOUTH_PARTS} as const;
export function allPartDefinitions():PartDefinition[]{return[...Object.values(BODY_PARTS),...Object.values(HAIR_PARTS),...Object.values(FACE_PARTS),...Object.values(EYE_PARTS),...Object.values(BROW_PARTS),...Object.values(NOSE_PARTS),...Object.values(MOUTH_PARTS)];}
