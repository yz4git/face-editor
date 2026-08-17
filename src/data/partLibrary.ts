import type {
  BrowStyleId, CharacterBaseId, ColorRole, EyeStyleId, FaceShapeId, HairStyleId,
  MouthStyleId, NoseStyleId, PartCategory, PartDefinition, PartTriangleDefinition, Vec2,
} from '../core/types';

type TriSpec = Omit<PartTriangleDefinition,'points'> & { points: readonly [Vec2,Vec2,Vec2] };
const tri=(layer:string,zIndex:number,colorRole:ColorRole,a:Vec2,b:Vec2,c:Vec2,shade=0):TriSpec=>({layer,zIndex,colorRole,shade,points:[a,b,c]});
const quad=(layer:string,zIndex:number,colorRole:ColorRole,a:Vec2,b:Vec2,c:Vec2,d:Vec2,shadeA=0,shadeB=shadeA):TriSpec[]=>[
  tri(layer,zIndex,colorRole,a,b,c,shadeA),tri(layer,zIndex,colorRole,a,c,d,shadeB),
];
const boundsOf=(items:readonly TriSpec[])=>{
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const item of items) for(const [x,y] of item.points){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  return {minX,minY,maxX,maxY};
};
const part=<T extends string>(id:T,label:string,category:PartCategory,triangles:readonly TriSpec[],tags:string[]=[]):PartDefinition<T>=>({
  id,label,category,anchor:[0,0],bounds:boundsOf(triangles),tags,triangles,
});

function body(base:CharacterBaseId):PartDefinition<CharacterBaseId>{
  const shoulder=base==='female'?1.15:1.27;
  const waist=base==='female'?.78:.9;
  const jacket:TriSpec[]=[
    tri('shirt',1,'shirt',[-.48,-.38],[.48,-.38],[.39,-2.02],0),
    tri('shirt',1,'shirt',[-.48,-.38],[.39,-2.02],[-.39,-2.02],8),
    tri('jacket',2,'jacket',[-.48,-.43],[-shoulder,-.82],[-waist,-2.05],0),
    tri('jacket',2,'jacket',[-.48,-.43],[-waist,-2.05],[-.40,-1.92],11),
    tri('jacket',2,'jacket',[.48,-.43],[shoulder,-.82],[waist,-2.05],-8),
    tri('jacket',2,'jacket',[.48,-.43],[waist,-2.05],[.40,-1.92],2),
    ...quad('hood',6,'hood',[-.58,-.44],[-.18,-.18],[-.04,-.53],[-.36,-.68],0,-7),
    ...quad('hood',6,'hood',[.58,-.44],[.18,-.18],[.04,-.53],[.36,-.68],-8,-3),
    ...quad('strap',7,'strap',[.42,-.34],[.59,-.47],[-.52,-1.98],[-.68,-1.85],0,-12),
    ...quad('accent',8,'accent',[-.91,-.83],[-.82,-.87],[-.65,-1.96],[-.75,-2.01],0,0),
    ...quad('accent',8,'accent',[.70,-1.03],[.89,-1.16],[.79,-1.37],[.60,-1.24],0,0),
  ];
  return part(base,base==='female'?'Female base':'Male base','body',jacket,[base,'base']);
}

function facePart(id:FaceShapeId,label:string,w:number,jaw:number,chin:number):PartDefinition<FaceShapeId>{
  const center:Vec2=[0,.58];
  const ring:Vec2[]=[[-.48,1.33],[.48,1.33],[w,1.05],[w,.52],[jaw,.15],[0,chin],[-jaw,.15],[-w,.52],[-w,1.05]];
  const tones=[0,6,-5,4,-7,2,7,-4,3];
  const ts:TriSpec[]=[];
  for(let i=0;i<ring.length;i++)ts.push(tri('face',5,'skin',center,ring[i],ring[(i+1)%ring.length],tones[i]));
  ts.push(tri('ears',5,'skin',[-w,.74],[-w-.14,.65],[-w,.43],-4));
  ts.push(tri('ears',5,'skin',[w,.74],[w+.14,.65],[w,.43],-7));
  ts.push(...quad('neck',4,'skin',[-.22,.02],[.22,.02],[.2,-.42],[-.2,-.42],-5,-10));
  return part(id,label,'face',ts,['face']);
}

const hairBaseFront:TriSpec[]=[
  tri('hair-front',15,'hair',[-.72,1.08],[-.34,1.58],[-.18,.94],0),
  tri('hair-front',15,'hair',[-.34,1.58],[.08,1.70],[-.18,.94],12),
  tri('hair-front',15,'hair', [.08,1.70],[.49,1.48],[.13,.90],0),
  tri('hair-front',15,'hair', [.49,1.48],[.72,1.04],[.13,.90],-15),
  tri('hair-front',15,'hair',[-.72,1.08],[-.93,.93],[-.58,.62],-15),
  tri('hair-front',15,'hair', [.72,1.04],[.90,.88],[.60,.54],0),
  tri('hair-front',15,'hair',[-.18,.94],[.03,1.22],[.13,.90],-15),
  tri('hair-front',15,'hair',[-.58,.62],[-.32,.97],[-.24,.45],0),
];
const hairBaseBack:TriSpec[]=[
  tri('hair-back',3,'hair',[-.64,.98],[-.85,.18],[-.50,-.05],-16),
  tri('hair-back',3,'hair',[ .64,.98],[ .85,.18],[ .50,-.05],-8),
];
function hairPart(id:HairStyleId,label:string,extra:TriSpec[]):PartDefinition<HairStyleId>{return part(id,label,'hair',[...hairBaseBack,...extra,...hairBaseFront],[id,'hair']);}

function eyePart(id:EyeStyleId,label:string,w:number,h:number,tilt=0):PartDefinition<EyeStyleId>{
  const localTilt=(p:Vec2):Vec2=>{const c=Math.cos(tilt),s=Math.sin(tilt);return[p[0]*c-p[1]*s,p[0]*s+p[1]*c]};
  const A=localTilt([-w/2,0]),B=localTilt([0,h/2]),C=localTilt([w/2,0]),D=localTilt([0,-h/2]);
  const iw=w*.28,ih=h*.72;
  return part(id,label,'eye',[
    ...quad('eye-white',8,'white',A,B,C,D,0,-5),
    ...quad('iris',9,'eyes',[-iw/2,.01],[0,ih/2],[iw/2,.01],[0,-ih/2],8,-16),
    tri('pupil',10,'pupil',[-.018,.02],[.018,.02],[0,-ih*.3]),
    tri('eye-glint',11,'white',[-.02,.07],[.035,.09],[-.002,.025]),
  ],['eye']);
}

function browPart(id:BrowStyleId,label:string,w:number,h:number,angle=0):PartDefinition<BrowStyleId>{
  return part(id,label,'brow',[...quad('brows',12,'brows',[-w/2,0],[w/2,angle],[w/2,angle+h],[-w/2,h],0,8)],['brow']);
}

function nosePart(id:NoseStyleId,label:string):PartDefinition<NoseStyleId>{
  if(id==='line')return part(id,label,'nose',[tri('nose',12,'skin',[-.025,.06],[.02,.16],[.035,.02],-24)],['nose']);
  const size=id==='small'?.045:id==='soft'?.06:.075;
  return part(id,label,'nose',[
    tri('nose',12,'skin',[0,.14],[-size,-.02],[size*.25,.01],-24),
    tri('nose',12,'skin',[0,.14],[size*.25,.01],[size,.03],-16),
  ],['nose']);
}

function mouthPart(id:MouthStyleId,label:string):PartDefinition<MouthStyleId>{
  if(id==='neutral')return part(id,label,'mouth',[...quad('mouth',13,'mouth',[-.16,.01],[.16,.01],[.16,-.008],[-.16,-.008])],['mouth']);
  if(id==='o')return part(id,label,'mouth',[...quad('mouth',13,'mouth',[-.07,.07],[.07,.07],[.07,-.07],[-.07,-.07],0,10)],['mouth']);
  const w=id==='soft-smile'?.16:.24;
  if(id==='smile-open')return part(id,label,'mouth',[
    tri('mouth',13,'mouth',[-w,.04],[w,.04],[0,-.17]),
    tri('mouth-detail',14,'tongue',[-w*.55,-.06],[w*.55,-.06],[0,-.15]),
  ],['mouth']);
  return part(id,label,'mouth',[tri('mouth',13,'mouth',[-w,.01],[0,-.06],[w,.01])],['mouth']);
}

export const BODY_PARTS:Record<CharacterBaseId,PartDefinition<CharacterBaseId>>={female:body('female'),male:body('male')};
export const FACE_PARTS:Record<FaceShapeId,PartDefinition<FaceShapeId>>={
  soft:facePart('soft','Soft',.68,.63,-.08),oval:facePart('oval','Oval',.63,.58,-.16),angular:facePart('angular','Angular',.70,.52,-.13),round:facePart('round','Round',.70,.68,.02),
};
export const HAIR_PARTS:Record<HairStyleId,PartDefinition<HairStyleId>>={
  ponytail:hairPart('ponytail','Ponytail',[tri('hair-back',3,'hair',[.58,1.12],[1.32,1.28],[.92,.73],10),tri('hair-back',3,'hair',[1.32,1.28],[1.18,.44],[.92,.73],-16),tri('hair-back',3,'hair',[1.18,.44],[.98,-.02],[.82,.55],0)]),
  'short-spike':hairPart('short-spike','Short spike',[tri('hair-front',15,'hair',[.38,1.48],[.76,1.32],[.55,1.05],12),tri('hair-back',3,'hair',[-.72,1.28],[-.98,1.10],[-.72,.93],6)]),
  bob:hairPart('bob','Bob',[tri('hair-front',15,'hair',[.61,.78],[.70,.08],[.42,.27],-15),tri('hair-back',3,'hair',[-.70,.72],[-.72,.02],[-.40,.22],-10),tri('hair-back',3,'hair',[.70,.72],[.72,.02],[.40,.22],4)]),
  long:hairPart('long','Long',[tri('hair-back',3,'hair',[-.72,.65],[-.78,-.75],[-.42,-.50],-16),tri('hair-back',3,'hair',[.72,.65],[.78,-.75],[.42,-.50],10)]),
  'side-tail':hairPart('side-tail','Side tail',[tri('hair-back',3,'hair',[.72,1.12],[1.48,1.10],[1.04,.62],10),tri('hair-back',3,'hair',[1.48,1.10],[1.28,.22],[1.04,.62],-16),tri('hair-back',3,'hair',[1.28,.22],[1.02,-.18],[.94,.47],0)]),
  'twin-tail':hairPart('twin-tail','Twin tail',[tri('hair-back',3,'hair',[-.68,1.02],[-1.28,.90],[-1.02,.34],10),tri('hair-back',3,'hair',[-1.28,.90],[-1.12,.12],[-1.02,.34],-16),tri('hair-back',3,'hair',[.68,1.02],[1.28,.90],[1.02,.34],10),tri('hair-back',3,'hair',[1.28,.90],[1.12,.12],[1.02,.34],-16)]),
};
export const EYE_PARTS:Record<EyeStyleId,PartDefinition<EyeStyleId>>={bright:eyePart('bright','Bright',.27,.22,.01),soft:eyePart('soft','Soft',.27,.18,0),sharp:eyePart('sharp','Sharp',.29,.16,.05),round:eyePart('round','Round',.24,.24,0),narrow:eyePart('narrow','Narrow',.29,.12,.03)};
export const BROW_PARTS:Record<BrowStyleId,PartDefinition<BrowStyleId>>={soft:browPart('soft','Soft',.28,.055,.04),straight:browPart('straight','Straight',.29,.045,0),angled:browPart('angled','Angled',.30,.06,.09),thin:browPart('thin','Thin',.28,.03,.02),bold:browPart('bold','Bold',.31,.08,.04)};
export const NOSE_PARTS:Record<NoseStyleId,PartDefinition<NoseStyleId>>={diamond:nosePart('diamond','Diamond'),small:nosePart('small','Small'),line:nosePart('line','Line'),soft:nosePart('soft','Soft')};
export const MOUTH_PARTS:Record<MouthStyleId,PartDefinition<MouthStyleId>>={'smile-open':mouthPart('smile-open','Open smile'),smile:mouthPart('smile','Smile'),neutral:mouthPart('neutral','Neutral'),'soft-smile':mouthPart('soft-smile','Soft smile'),o:mouthPart('o','O')};

export const PART_LIBRARY={body:BODY_PARTS,hair:HAIR_PARTS,face:FACE_PARTS,eye:EYE_PARTS,brow:BROW_PARTS,nose:NOSE_PARTS,mouth:MOUTH_PARTS} as const;
export function allPartDefinitions():PartDefinition[]{return[...Object.values(BODY_PARTS),...Object.values(HAIR_PARTS),...Object.values(FACE_PARTS),...Object.values(EYE_PARTS),...Object.values(BROW_PARTS),...Object.values(NOSE_PARTS),...Object.values(MOUTH_PARTS)];}
