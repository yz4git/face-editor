import type {
  AccentStyleId, BrowStyleId, CharacterBaseId, ColorRole, EyeStyleId, FaceShapeId, HairStyleId, HoodStyleId,
  MouthStyleId, NoseStyleId, OutfitStyleId, PartCategory, PartDefinition, PartTriangleDefinition, ShirtStyleId, StrapStyleId, Vec2,
} from '../core/types';
import { generatedSourceTriangles, type GeneratedSourceKind, type GeneratedSourceRole } from './generatedSourceSheetGeometry';
import { generatedOutfitComponentTriangles, type OutfitComponentRole } from './outfitComponentGeometry';
import { clothingPackV1Triangles, type ClothingPackV1Kind, type ClothingPackV1Role } from './clothingVariationPackV1Geometry';

type TriSpec = Omit<PartTriangleDefinition,'points'> & { points: readonly [Vec2,Vec2,Vec2] };
const tri=(layer:string,zIndex:number,colorRole:ColorRole,a:Vec2,b:Vec2,c:Vec2,shade=0):TriSpec=>({layer,zIndex,colorRole,shade,points:[a,b,c]});
const quad=(layer:string,zIndex:number,colorRole:ColorRole,a:Vec2,b:Vec2,c:Vec2,d:Vec2,shadeA=0,shadeB=shadeA):TriSpec[]=>[
  tri(layer,zIndex,colorRole,a,b,c,shadeA),tri(layer,zIndex,colorRole,a,c,d,shadeB),
];
const boundsOf=(items:readonly TriSpec[])=>{
  if(!items.length)return{minX:0,minY:0,maxX:0,maxY:0};
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const item of items)for(const[x,y]of item.points){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  return{minX,minY,maxX,maxY};
};
const part=<T extends string>(id:T,label:string,category:PartCategory,triangles:readonly TriSpec[],tags:string[]=[]):PartDefinition<T>=>({id,label,category,anchor:[0,0],bounds:boundsOf(triangles),tags,triangles});

function proceduralMaleBody():PartDefinition<CharacterBaseId>{
  const shoulder=1.27,waist=.90,geometry:TriSpec[]=[
    tri('shirt',1,'shirt',[-.48,-.38],[.48,-.38],[.39,-2.02],0),tri('shirt',1,'shirt',[-.48,-.38],[.39,-2.02],[-.39,-2.02],8),
    tri('jacket',2,'jacket',[-.48,-.43],[-shoulder,-.82],[-waist,-2.05],0),tri('jacket',2,'jacket',[-.48,-.43],[-waist,-2.05],[-.40,-1.92],11),
    tri('jacket',2,'jacket',[.48,-.43],[shoulder,-.82],[waist,-2.05],-8),tri('jacket',2,'jacket',[.48,-.43],[waist,-2.05],[.40,-1.92],2),
    ...quad('hood',6,'hood',[-.58,-.44],[-.18,-.18],[-.04,-.53],[-.36,-.68],0,-7),...quad('hood',6,'hood',[.58,-.44],[.18,-.18],[.04,-.53],[.36,-.68],-8,-3),
    ...quad('strap',7,'strap',[.42,-.34],[.59,-.47],[-.52,-1.98],[-.68,-1.85],0,-12),...quad('accent',8,'accent',[-.91,-.83],[-.82,-.87],[-.65,-1.96],[-.75,-2.01]),...quad('accent',8,'accent',[.70,-1.03],[.89,-1.16],[.79,-1.37],[.60,-1.24]),
  ];
  return part('male','Male base','body',geometry,['male','base','procedural']);
}

function styleFor(kind:GeneratedSourceKind,role:GeneratedSourceRole):readonly [string,number,ColorRole]{
  if(kind==='hair')return role==='accent'?['hair-accent',16,'accent']:['hair-front',15,'hair'];
  if(kind==='face')return role==='outline'?['face-outline',4,'pupil']:['face',5,'skin'];
  if(kind==='eye'){
    if(role==='outline')return['eye-outline',8,'pupil'];
    if(role==='white')return['eye-white',9,'white'];
    if(role==='eyes')return['iris',10,'eyes'];
    if(role==='pupil')return['pupil',11,'pupil'];
    return['eye-glint',12,'white'];
  }
  if(kind==='brow')return['brows',12,'brows'];
  if(kind==='nose')return['nose',12,'skin'];
  if(kind==='mouth'){
    if(role==='outline')return['mouth-outline',13,'pupil'];
    if(role==='tongue')return['mouth-detail',15,'tongue'];
    return['mouth',14,'mouth'];
  }
  if(kind==='outfit'){
    if(role==='shirt')return['shirt',1,'shirt'];
    if(role==='hood')return['hood',6,'hood'];
    if(role==='accent')return['accent',8,'accent'];
    return['jacket',2,'jacket'];
  }
  throw new Error(`Unsupported generated source role ${kind}:${role}`);
}
function componentStyleFor(role:OutfitComponentRole):readonly [string,number,ColorRole]{
  if(role==='hood')return['hood',6,'hood'];
  if(role==='shirt')return['shirt',1,'shirt'];
  if(role==='strap')return['strap',7,'strap'];
  if(role==='metal')return['strap-metal',8,'metal'];
  return['accent',8,'accent'];
}
function packStyleFor(role:ClothingPackV1Role):readonly[string,number,ColorRole]{
  if(role==='jacket')return['jacket',2,'jacket'];
  if(role==='hood')return['hood',6,'hood'];
  if(role==='shirt')return['shirt',1,'shirt'];
  if(role==='strap')return['strap',7,'strap'];
  if(role==='metal')return['strap-metal',8,'metal'];
  return['accent',8,'accent'];
}
function generatedPart<T extends string>(kind:GeneratedSourceKind,id:T,label:string,category:PartCategory):PartDefinition<T>{
  const geometry:TriSpec[]=generatedSourceTriangles(kind,id).map(({role,shade,points})=>{const[layer,zIndex,colorRole]=styleFor(kind,role);return tri(layer,zIndex,colorRole,points[0],points[1],points[2],shade);});
  return part(id,label,category,geometry,[id,kind,'generated-source-sheet','vectorized-v2']);
}
function generatedComponentPart<T extends string>(kind:'hood'|'shirt'|'strap'|'accent',id:T,label:string):PartDefinition<T>{
  const geometry:TriSpec[]=generatedOutfitComponentTriangles(kind,id).map(({role,shade,points})=>{const[layer,zIndex,colorRole]=componentStyleFor(role);return tri(layer,zIndex,colorRole,points[0],points[1],points[2],shade);});
  return part(id,label,'outfit',geometry,[id,kind,'generated-source-sheet','outfit-component','vectorized-v2']);
}
function imageDerivedPart<T extends string>(kind:ClothingPackV1Kind,id:T,label:string):PartDefinition<T>{
  const geometry:TriSpec[]=clothingPackV1Triangles(kind,id).map(({role,shade,points})=>{const[layer,zIndex,colorRole]=packStyleFor(role);return tri(layer,zIndex,colorRole,points[0],points[1],points[2],shade);});
  return part(id,label,'outfit',geometry,[id,kind,'generated-source-sheet','image-derived','clothing-pack-v1',...(kind==='outfit'?[]:['outfit-component'])]);
}

const hairLabels:Record<HairStyleId,string>={ponytail:'High ponytail',braid:'Twin braids',bob:'Short bob','half-up':'Spiky half-up',long:'Long headband',bun:'Twin buns','short-spike':'Layered short','side-tail':'Side ponytail',wavy:'Long curls','twin-tail':'Hair clip short'};
const eyeLabels:Record<EyeStyleId,string>={bright:'Warm brown',determined:'Amber',sharp:'Deep brown',round:'Mahogany',soft:'Light brown',sleepy:'Olive',sparkle:'Deep blue',closed:'Violet',narrow:'Teal','side-glance':'Steel gray'};
const faceLabels:Record<FaceShapeId,string>={soft:'Soft oval',oval:'Soft square',angular:'Tapered',round:'Round',square:'Tall square',pointed:'Pointed','long-oval':'Long oval',hex:'Hex jaw',diamond:'Diamond',tapered:'Compact tapered'};
const browLabels:Record<BrowStyleId,string>={soft:'Soft arch',straight:'Strong arch',angled:'Angled',thin:'Thin soft',bold:'Bold',arched:'Sharp angle',calm:'Calm',raised:'Raised',flat:'Flat',worried:'Worried'};
const noseLabels:Record<NoseStyleId,string>={diamond:'Diamond',small:'Slim',line:'Line',soft:'Soft',tall:'Tall',tiny:'Tiny',faceted:'Faceted',profile:'Profile',wide:'Wide',button:'Button'};
const mouthLabels:Record<MouthStyleId,string>={'smile-open':'Open smile',smile:'Small smile',neutral:'Neutral','soft-smile':'Soft smile',o:'O',surprised:'Surprised',smirk:'Smirk',frown:'Frown','wide-open':'Wide open',curve:'Curve'};
const outfitLabels:Record<OutfitStyleId,string>={hooded:'Hooded jacket','high-collar':'High collar','zip-collar':'Zip collar',drawstring:'Drawstring hoodie','short-sleeve':'Short sleeve',vest:'Sleeveless vest',blazer:'Tailored blazer',bomber:'Bomber jacket','long-coat':'Long coat','tactical-jacket':'Tactical jacket','cropped-jacket':'Cropped jacket','tech-parka':'Tech parka'};
const hoodLabels:Record<HoodStyleId,string>={folded:'Folded hood',drawstring:'Drawstring hood',sharp:'Sharp collar',high:'High collar',wide:'Wide collar',wing:'Wing collar','open-collar':'Open collar','stand-collar':'Stand collar','fur-collar':'Fur collar','double-collar':'Double collar','high-wrap':'High wrap','split-lapel':'Split lapel'};
const shirtLabels:Record<ShirtStyleId,string>={tee:'T-shirt','long-sleeve':'Long sleeve',tank:'Tank','three-quarter':'3/4 sleeve',turtleneck:'Turtleneck','sleeveless-high':'Sleeveless high neck','dress-shirt':'Dress shirt',henley:'Henley',sweater:'Sweater','hoodie-inner':'Hoodie inner','vest-inner':'Vest inner','utility-top':'Utility top'};
const strapLabels:Record<StrapStyleId,string>={simple:'Simple strap',padded:'Padded strap','single-pouch':'Single pouch','double-pouch':'Double pouch',cross:'Cross harness','y-harness':'Y harness','chest-rig':'Chest rig','shoulder-brace':'Shoulder brace','belt-pack':'Belt pack','asymmetric-strap':'Asymmetric strap','tech-harness':'Tech harness','layered-pouch':'Layered pouch'};
const accentLabels:Record<AccentStyleId,string>={diamond:'Diamond','long-strip':'Long strip','point-strip':'Point strip',corner:'Corner',chevron:'Chevron',slash:'Slash',taper:'Taper',triangle:'Triangle','panel-line':'Panel line','arm-band':'Arm band',badge:'Badge','zip-line':'Zip line','belt-buckle':'Belt buckle','tech-emblem':'Tech emblem'};

export const BODY_PARTS:Record<CharacterBaseId,PartDefinition<CharacterBaseId>>={female:part('female','Female base','body',[],['female','base','generated-outfit-base']),male:proceduralMaleBody()};
export const OUTFIT_PARTS:Record<OutfitStyleId,PartDefinition<OutfitStyleId>>={
  hooded:generatedPart('outfit','hooded',outfitLabels.hooded,'outfit'),'high-collar':generatedPart('outfit','high-collar',outfitLabels['high-collar'],'outfit'),'zip-collar':generatedPart('outfit','zip-collar',outfitLabels['zip-collar'],'outfit'),drawstring:generatedPart('outfit','drawstring',outfitLabels.drawstring,'outfit'),'short-sleeve':generatedPart('outfit','short-sleeve',outfitLabels['short-sleeve'],'outfit'),vest:generatedPart('outfit','vest',outfitLabels.vest,'outfit'),
  blazer:imageDerivedPart('outfit','blazer',outfitLabels.blazer),bomber:imageDerivedPart('outfit','bomber',outfitLabels.bomber),'long-coat':imageDerivedPart('outfit','long-coat',outfitLabels['long-coat']),'tactical-jacket':imageDerivedPart('outfit','tactical-jacket',outfitLabels['tactical-jacket']),'cropped-jacket':imageDerivedPart('outfit','cropped-jacket',outfitLabels['cropped-jacket']),'tech-parka':imageDerivedPart('outfit','tech-parka',outfitLabels['tech-parka']),
};
export const HOOD_PARTS:Record<HoodStyleId,PartDefinition<HoodStyleId>>={
  folded:generatedComponentPart('hood','folded',hoodLabels.folded),drawstring:generatedComponentPart('hood','drawstring',hoodLabels.drawstring),sharp:generatedComponentPart('hood','sharp',hoodLabels.sharp),high:generatedComponentPart('hood','high',hoodLabels.high),wide:generatedComponentPart('hood','wide',hoodLabels.wide),wing:generatedComponentPart('hood','wing',hoodLabels.wing),
  'open-collar':imageDerivedPart('hood','open-collar',hoodLabels['open-collar']),'stand-collar':imageDerivedPart('hood','stand-collar',hoodLabels['stand-collar']),'fur-collar':imageDerivedPart('hood','fur-collar',hoodLabels['fur-collar']),'double-collar':imageDerivedPart('hood','double-collar',hoodLabels['double-collar']),'high-wrap':imageDerivedPart('hood','high-wrap',hoodLabels['high-wrap']),'split-lapel':imageDerivedPart('hood','split-lapel',hoodLabels['split-lapel']),
};
export const SHIRT_PARTS:Record<ShirtStyleId,PartDefinition<ShirtStyleId>>={
  tee:generatedComponentPart('shirt','tee',shirtLabels.tee),'long-sleeve':generatedComponentPart('shirt','long-sleeve',shirtLabels['long-sleeve']),tank:generatedComponentPart('shirt','tank',shirtLabels.tank),'three-quarter':generatedComponentPart('shirt','three-quarter',shirtLabels['three-quarter']),turtleneck:generatedComponentPart('shirt','turtleneck',shirtLabels.turtleneck),'sleeveless-high':generatedComponentPart('shirt','sleeveless-high',shirtLabels['sleeveless-high']),
  'dress-shirt':imageDerivedPart('shirt','dress-shirt',shirtLabels['dress-shirt']),henley:imageDerivedPart('shirt','henley',shirtLabels.henley),sweater:imageDerivedPart('shirt','sweater',shirtLabels.sweater),'hoodie-inner':imageDerivedPart('shirt','hoodie-inner',shirtLabels['hoodie-inner']),'vest-inner':imageDerivedPart('shirt','vest-inner',shirtLabels['vest-inner']),'utility-top':imageDerivedPart('shirt','utility-top',shirtLabels['utility-top']),
};
export const STRAP_PARTS:Record<StrapStyleId,PartDefinition<StrapStyleId>>={
  simple:generatedComponentPart('strap','simple',strapLabels.simple),padded:generatedComponentPart('strap','padded',strapLabels.padded),'single-pouch':generatedComponentPart('strap','single-pouch',strapLabels['single-pouch']),'double-pouch':generatedComponentPart('strap','double-pouch',strapLabels['double-pouch']),cross:generatedComponentPart('strap','cross',strapLabels.cross),'y-harness':generatedComponentPart('strap','y-harness',strapLabels['y-harness']),
  'chest-rig':imageDerivedPart('strap','chest-rig',strapLabels['chest-rig']),'shoulder-brace':imageDerivedPart('strap','shoulder-brace',strapLabels['shoulder-brace']),'belt-pack':imageDerivedPart('strap','belt-pack',strapLabels['belt-pack']),'asymmetric-strap':imageDerivedPart('strap','asymmetric-strap',strapLabels['asymmetric-strap']),'tech-harness':imageDerivedPart('strap','tech-harness',strapLabels['tech-harness']),'layered-pouch':imageDerivedPart('strap','layered-pouch',strapLabels['layered-pouch']),
};
export const ACCENT_PARTS:Record<AccentStyleId,PartDefinition<AccentStyleId>>={
  diamond:generatedComponentPart('accent','diamond',accentLabels.diamond),'long-strip':generatedComponentPart('accent','long-strip',accentLabels['long-strip']),'point-strip':generatedComponentPart('accent','point-strip',accentLabels['point-strip']),corner:generatedComponentPart('accent','corner',accentLabels.corner),chevron:generatedComponentPart('accent','chevron',accentLabels.chevron),slash:generatedComponentPart('accent','slash',accentLabels.slash),taper:generatedComponentPart('accent','taper',accentLabels.taper),triangle:generatedComponentPart('accent','triangle',accentLabels.triangle),
  'panel-line':imageDerivedPart('accent','panel-line',accentLabels['panel-line']),'arm-band':imageDerivedPart('accent','arm-band',accentLabels['arm-band']),badge:imageDerivedPart('accent','badge',accentLabels.badge),'zip-line':imageDerivedPart('accent','zip-line',accentLabels['zip-line']),'belt-buckle':imageDerivedPart('accent','belt-buckle',accentLabels['belt-buckle']),'tech-emblem':imageDerivedPart('accent','tech-emblem',accentLabels['tech-emblem']),
};
export const HAIR_PARTS:Record<HairStyleId,PartDefinition<HairStyleId>>={ponytail:generatedPart('hair','ponytail',hairLabels.ponytail,'hair'),braid:generatedPart('hair','braid',hairLabels.braid,'hair'),bob:generatedPart('hair','bob',hairLabels.bob,'hair'),'half-up':generatedPart('hair','half-up',hairLabels['half-up'],'hair'),long:generatedPart('hair','long',hairLabels.long,'hair'),bun:generatedPart('hair','bun',hairLabels.bun,'hair'),'short-spike':generatedPart('hair','short-spike',hairLabels['short-spike'],'hair'),'side-tail':generatedPart('hair','side-tail',hairLabels['side-tail'],'hair'),wavy:generatedPart('hair','wavy',hairLabels.wavy,'hair'),'twin-tail':generatedPart('hair','twin-tail',hairLabels['twin-tail'],'hair')};
export const FACE_PARTS:Record<FaceShapeId,PartDefinition<FaceShapeId>>={soft:generatedPart('face','soft',faceLabels.soft,'face'),oval:generatedPart('face','oval',faceLabels.oval,'face'),angular:generatedPart('face','angular',faceLabels.angular,'face'),round:generatedPart('face','round',faceLabels.round,'face'),square:generatedPart('face','square',faceLabels.square,'face'),pointed:generatedPart('face','pointed',faceLabels.pointed,'face'),'long-oval':generatedPart('face','long-oval',faceLabels['long-oval'],'face'),hex:generatedPart('face','hex',faceLabels.hex,'face'),diamond:generatedPart('face','diamond',faceLabels.diamond,'face'),tapered:generatedPart('face','tapered',faceLabels.tapered,'face')};
export const EYE_PARTS:Record<EyeStyleId,PartDefinition<EyeStyleId>>={bright:generatedPart('eye','bright',eyeLabels.bright,'eye'),determined:generatedPart('eye','determined',eyeLabels.determined,'eye'),sharp:generatedPart('eye','sharp',eyeLabels.sharp,'eye'),round:generatedPart('eye','round',eyeLabels.round,'eye'),soft:generatedPart('eye','soft',eyeLabels.soft,'eye'),sleepy:generatedPart('eye','sleepy',eyeLabels.sleepy,'eye'),sparkle:generatedPart('eye','sparkle',eyeLabels.sparkle,'eye'),closed:generatedPart('eye','closed',eyeLabels.closed,'eye'),narrow:generatedPart('eye','narrow',eyeLabels.narrow,'eye'),'side-glance':generatedPart('eye','side-glance',eyeLabels['side-glance'],'eye')};
export const BROW_PARTS:Record<BrowStyleId,PartDefinition<BrowStyleId>>={soft:generatedPart('brow','soft',browLabels.soft,'brow'),straight:generatedPart('brow','straight',browLabels.straight,'brow'),angled:generatedPart('brow','angled',browLabels.angled,'brow'),thin:generatedPart('brow','thin',browLabels.thin,'brow'),bold:generatedPart('brow','bold',browLabels.bold,'brow'),arched:generatedPart('brow','arched',browLabels.arched,'brow'),calm:generatedPart('brow','calm',browLabels.calm,'brow'),raised:generatedPart('brow','raised',browLabels.raised,'brow'),flat:generatedPart('brow','flat',browLabels.flat,'brow'),worried:generatedPart('brow','worried',browLabels.worried,'brow')};
export const NOSE_PARTS:Record<NoseStyleId,PartDefinition<NoseStyleId>>={diamond:generatedPart('nose','diamond',noseLabels.diamond,'nose'),small:generatedPart('nose','small',noseLabels.small,'nose'),line:generatedPart('nose','line',noseLabels.line,'nose'),soft:generatedPart('nose','soft',noseLabels.soft,'nose'),tall:generatedPart('nose','tall',noseLabels.tall,'nose'),tiny:generatedPart('nose','tiny',noseLabels.tiny,'nose'),faceted:generatedPart('nose','faceted',noseLabels.faceted,'nose'),profile:generatedPart('nose','profile',noseLabels.profile,'nose'),wide:generatedPart('nose','wide',noseLabels.wide,'nose'),button:generatedPart('nose','button',noseLabels.button,'nose')};
export const MOUTH_PARTS:Record<MouthStyleId,PartDefinition<MouthStyleId>>={'smile-open':generatedPart('mouth','smile-open',mouthLabels['smile-open'],'mouth'),smile:generatedPart('mouth','smile',mouthLabels.smile,'mouth'),neutral:generatedPart('mouth','neutral',mouthLabels.neutral,'mouth'),'soft-smile':generatedPart('mouth','soft-smile',mouthLabels['soft-smile'],'mouth'),o:generatedPart('mouth','o',mouthLabels.o,'mouth'),surprised:generatedPart('mouth','surprised',mouthLabels.surprised,'mouth'),smirk:generatedPart('mouth','smirk',mouthLabels.smirk,'mouth'),frown:generatedPart('mouth','frown',mouthLabels.frown,'mouth'),'wide-open':generatedPart('mouth','wide-open',mouthLabels['wide-open'],'mouth'),curve:generatedPart('mouth','curve',mouthLabels.curve,'mouth')};

export const PART_LIBRARY={body:BODY_PARTS,outfit:OUTFIT_PARTS,hood:HOOD_PARTS,shirt:SHIRT_PARTS,strap:STRAP_PARTS,accent:ACCENT_PARTS,hair:HAIR_PARTS,face:FACE_PARTS,eye:EYE_PARTS,brow:BROW_PARTS,nose:NOSE_PARTS,mouth:MOUTH_PARTS} as const;
export function allPartDefinitions():PartDefinition[]{return[...Object.values(BODY_PARTS),...Object.values(OUTFIT_PARTS),...Object.values(HOOD_PARTS),...Object.values(SHIRT_PARTS),...Object.values(STRAP_PARTS),...Object.values(ACCENT_PARTS),...Object.values(HAIR_PARTS),...Object.values(FACE_PARTS),...Object.values(EYE_PARTS),...Object.values(BROW_PARTS),...Object.values(NOSE_PARTS),...Object.values(MOUTH_PARTS)];}
