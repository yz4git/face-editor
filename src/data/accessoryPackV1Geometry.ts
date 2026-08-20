import type { ColorRole,Vec2 } from '../core/types';
import type { EarAccessoryStyleId,EyewearStyleId,FaceDetailStyleId,HeadwearStyleId } from '../core/characterExpansion';
import { qualityAccessoryTriangles } from './accessoryQualityV11Geometry';

export interface AccessoryTriangle{layer:string;zIndex:number;colorRole:ColorRole;shade:number;points:readonly[Vec2,Vec2,Vec2]}
const t=(layer:string,zIndex:number,colorRole:ColorRole,a:Vec2,b:Vec2,c:Vec2,shade=0):AccessoryTriangle=>({layer,zIndex,colorRole,shade,points:[a,b,c]});
const q=(layer:string,zIndex:number,colorRole:ColorRole,a:Vec2,b:Vec2,c:Vec2,d:Vec2,shade=0):AccessoryTriangle[]=>[t(layer,zIndex,colorRole,a,b,c,shade),t(layer,zIndex,colorRole,a,c,d,shade-4)];
const rect=(layer:string,z:number,role:ColorRole,x1:number,y1:number,x2:number,y2:number,shade=0)=>q(layer,z,role,[x1,y1],[x2,y1],[x2,y2],[x1,y2],shade);
const ring=(layer:string,z:number,role:ColorRole,cx:number,cy:number,rx:number,ry:number,thickness=.035,segments=10,shade=0)=>{
  const out:AccessoryTriangle[]=[];
  for(let i=0;i<segments;i++){
    const a=Math.PI*2*i/segments,b=Math.PI*2*(i+1)/segments;
    const oa:Vec2=[cx+Math.cos(a)*rx,cy+Math.sin(a)*ry],ob:Vec2=[cx+Math.cos(b)*rx,cy+Math.sin(b)*ry];
    const ia:Vec2=[cx+Math.cos(a)*(rx-thickness),cy+Math.sin(a)*(ry-thickness)],ib:Vec2=[cx+Math.cos(b)*(rx-thickness),cy+Math.sin(b)*(ry-thickness)];
    out.push(...q(layer,z,role,oa,ob,ib,ia,shade+(i%2?0:-4)));
  }
  return out;
};
const diamond=(layer:string,z:number,role:ColorRole,cx:number,cy:number,rx:number,ry:number,shade=0)=>[
  t(layer,z,role,[cx,cy+ry],[cx+rx,cy],[cx,cy-ry],shade),t(layer,z,role,[cx,cy+ry],[cx,cy-ry],[cx-rx,cy],shade-5),
];
const lensFrame=(shape:'round'|'square',shade=0)=>{
  const layer='eyewear',z=13.6,role:ColorRole='pupil',out:AccessoryTriangle[]=[];
  if(shape==='round')for(const cx of[-.30,.30])out.push(...ring(layer,z,role,cx,.64,.22,.15,.035,10,shade));
  else for(const cx of[-.30,.30]){
    out.push(...rect(layer,z,role,cx-.22,.78,cx+.22,.745,shade),...rect(layer,z,role,cx-.22,.535,cx+.22,.50,shade),...rect(layer,z,role,cx-.22,.745,cx-.185,.535,shade),...rect(layer,z,role,cx+.185,.745,cx+.22,.535,shade));
  }
  out.push(...rect(layer,z,role,-.09,.665,.09,.63,shade));return out;
};

const HEADWEAR:Record<Exclude<HeadwearStyleId,'none'>,AccessoryTriangle[]>={
  cap:[
    ...q('headwear',17,'jacket',[-.53,1.54],[-.35,1.73],[.36,1.73],[.58,1.51],2),
    ...q('headwear',17,'jacket',[-.53,1.54],[.58,1.51],[.48,1.35],[-.45,1.37],-5),
    ...q('headwear',17.1,'accent',[-.05,1.47],[.66,1.45],[.84,1.37],[.10,1.39],2),
  ],
  beanie:[
    t('headwear',17,'jacket',[-.56,1.39],[0,1.82],[.56,1.39],1),
    ...q('headwear',17,'jacket',[-.56,1.39],[.56,1.39],[.50,1.25],[-.50,1.25],-6),
    ...rect('headwear',17.1,'accent',-.50,1.34,.50,1.28,-2),
  ],
  beret:[
    t('headwear',17,'jacket',[-.58,1.48],[-.13,1.78],[.63,1.56],1),
    t('headwear',17,'jacket',[-.58,1.48],[.63,1.56],[.38,1.36],-7),
    ...rect('headwear',17.1,'accent',-.25,1.58,.14,1.54,-1),
  ],
  headband:[...q('headwear',17,'accent',[-.56,1.38],[-.49,1.48],[.50,1.48],[.57,1.38],1)],
  headphones:[
    ...ring('headwear',16.8,'metal',0,1.26,.66,.55,.055,14,-2).filter(item=>item.points.some(p=>p[1]>1.25)),
    ...rect('headwear',17,'metal',-.70,.88,-.56,1.28,-2),...rect('headwear',17,'metal',.56,.88,.70,1.28,-7),
    ...rect('headwear',17.1,'accent',-.67,.95,-.59,1.18,2),...rect('headwear',17.1,'accent',.59,.95,.67,1.18,-2),
  ],
  'goggles-up':[
    ...ring('headwear',17,'metal',-.24,1.43,.20,.12,.035,8,-2),...ring('headwear',17,'metal',.24,1.43,.20,.12,.035,8,-6),
    ...rect('headwear',17,'metal',-.055,1.455,.055,1.425,-3),...rect('headwear',16.9,'accent',-.47,1.45,-.42,1.41,1),...rect('headwear',16.9,'accent',.42,1.45,.47,1.41,-2),
  ],
  'small-crown':[
    t('headwear',17,'accent',[-.28,1.55],[-.20,1.85],[-.05,1.62],2),t('headwear',17,'accent',[-.05,1.62],[0,1.92],[.10,1.62],-1),t('headwear',17,'accent',[.10,1.62],[.25,1.84],[.31,1.54],-5),
    ...q('headwear',17,'accent',[-.28,1.55],[-.05,1.62],[.31,1.54],[.25,1.43],-3),
  ],
  'sci-fi-visor':[
    ...q('headwear',17,'metal',[-.58,1.44],[-.46,1.54],[.48,1.54],[.60,1.43],-4),
    ...q('headwear',17.1,'accent',[-.45,1.49],[-.18,1.56],[.43,1.50],[.23,1.42],3),
    ...rect('headwear',17,'metal',-.62,1.42,-.56,1.26,-4),...rect('headwear',17,'metal',.56,1.42,.62,1.26,-8),
  ],
};

const EYEWEAR:Record<Exclude<EyewearStyleId,'none'>,AccessoryTriangle[]>={
  'round-glasses':lensFrame('round'),
  'square-glasses':lensFrame('square'),
  'thin-frame':[
    ...rect('eyewear',13.6,'metal',-.52,.73,-.09,.705,-2),...rect('eyewear',13.6,'metal',.09,.73,.52,.705,-5),...rect('eyewear',13.6,'metal',-.06,.72,.06,.695,-3),
    ...rect('eyewear',13.6,'metal',-.52,.73,-.49,.54,-2),...rect('eyewear',13.6,'metal',.49,.73,.52,.54,-5),...rect('eyewear',13.6,'metal',-.52,.56,-.09,.535,-2),...rect('eyewear',13.6,'metal',.09,.56,.52,.535,-5),
  ],
  sunglasses:[
    ...q('eyewear',13.5,'pupil',[-.53,.76],[-.08,.74],[-.13,.54],[-.48,.55],-2),...q('eyewear',13.5,'pupil',[.08,.74],[.53,.76],[.48,.55],[.13,.54],-6),...rect('eyewear',13.6,'metal',-.10,.70,.10,.66,-2),
  ],
  monocle:[...ring('eyewear',13.6,'metal',.30,.64,.23,.17,.035,10,-2),...rect('eyewear',13.5,'metal',.48,.51,.51,.12,-4),...diamond('eyewear',13.6,'accent',.50,.08,.045,.06,-2)],
  'sport-goggles':[
    ...q('eyewear',13.5,'metal',[-.56,.77],[-.08,.80],[-.12,.50],[-.50,.52],-3),...q('eyewear',13.5,'metal',[.08,.80],[.56,.77],[.50,.52],[.12,.50],-8),
    ...q('eyewear',13.6,'accent',[-.49,.71],[-.13,.73],[-.17,.56],[-.45,.57],3),...q('eyewear',13.6,'accent',[.13,.73],[.49,.71],[.45,.57],[.17,.56],-1),
  ],
  'cyber-visor':[
    ...q('eyewear',13.5,'pupil',[-.57,.76],[-.34,.82],[.55,.76],[.46,.53],-4),t('eyewear',13.5,'pupil',[-.57,.76],[.46,.53],[-.48,.52],-8),
    ...q('eyewear',13.6,'accent',[-.42,.72],[-.05,.77],[.41,.70],[.18,.61],5),
  ],
  eyepatch:[...q('eyewear',13.5,'pupil',[.07,.80],[.50,.76],[.48,.48],[.12,.50],-4),...rect('eyewear',13.6,'metal',-.56,1.00,.53,.965,-4)],
};

const FACE_DETAIL:Record<Exclude<FaceDetailStyleId,'none'>,AccessoryTriangle[]>={
  mole:[...diamond('face-detail',12.8,'pupil',.30,.32,.026,.026,-2)],
  freckles:[
    ...diamond('face-detail',12.8,'brows',-.38,.42,.018,.015,-8),...diamond('face-detail',12.8,'brows',-.27,.39,.016,.014,-6),...diamond('face-detail',12.8,'brows',-.17,.42,.014,.013,-8),
    ...diamond('face-detail',12.8,'brows',[0.17][0],.42,.014,.013,-8),...diamond('face-detail',12.8,'brows',.27,.39,.016,.014,-6),...diamond('face-detail',12.8,'brows',.38,.42,.018,.015,-8),
  ],
  blush:[...q('face-detail',12.7,'tongue',[-.48,.38],[-.23,.42],[-.27,.27],[-.47,.25],10),...q('face-detail',12.7,'tongue',[.23,.42],[.48,.38],[.47,.25],[.27,.27],4)],
  scar:[...q('face-detail',12.9,'mouth',[-.42,.76],[-.37,.79],[-.12,.24],[-.18,.22],-7),...q('face-detail',12.9,'mouth',[-.31,.48],[-.20,.55],[-.18,.51],[-.29,.44],-3)],
  bandage:[...q('face-detail',12.9,'white',[.18,.47],[.47,.53],[.44,.31],[.15,.27],-8),...rect('face-detail',13,'metal',.28,.48,.31,.30,-6)],
  'face-paint':[t('face-detail',12.8,'accent',[-.50,.64],[-.25,.73],[-.34,.44],2),t('face-detail',12.8,'accent',[-.34,.44],[-.15,.31],[-.39,.28],-4)],
  'cheek-mark':[...diamond('face-detail',12.9,'accent',.36,.34,.11,.08,2),t('face-detail',12.9,'accent',[.25,.34],[.12,.40],[.24,.27],-3)],
  'under-eye-line':[...q('face-detail',12.9,'pupil',[-.47,.48],[-.14,.49],[-.18,.45],[-.43,.44],-4),...q('face-detail',12.9,'pupil',[.14,.49],[.47,.48],[.43,.44],[.18,.45],-7)],
};

const EAR:Record<Exclude<EarAccessoryStyleId,'none'>,AccessoryTriangle[]>={
  'stud-earring':[...diamond('ear-accessory',14.2,'accent',.59,.49,.045,.045,2)],
  'hoop-earring':[...ring('ear-accessory',14.2,'metal',.61,.39,.10,.15,.028,10,-3)],
  'ear-cuff':[...q('ear-accessory',14.2,'metal',[.55,.68],[.64,.71],[.64,.49],[.57,.52],-3)],
  'double-earring':[...diamond('ear-accessory',14.2,'accent',.59,.56,.035,.035,2),...diamond('ear-accessory',14.2,'metal',.62,.43,.032,.032,-3)],
  'chain-earring':[...diamond('ear-accessory',14.2,'accent',.59,.56,.035,.035,2),...rect('ear-accessory',14.2,'metal',.585,.52,.61,.20,-4),...diamond('ear-accessory',14.2,'accent',.598,.15,.045,.055,-2)],
  'comms-device':[...q('ear-accessory',14.2,'metal',[.52,.78],[.68,.73],[.67,.39],[.54,.44],-5),...rect('ear-accessory',14.3,'accent',.57,.65,.65,.51,2)],
  'cyber-earpiece':[...q('ear-accessory',14.2,'pupil',[.54,.75],[.69,.66],[.65,.35],[.55,.45],-3),...q('ear-accessory',14.3,'accent',[.59,.64],[.67,.58],[.64,.45],[.58,.49],4)],
  'star-earring':[t('ear-accessory',14.2,'accent',[.60,.50],[.64,.38],[.76,.38],2),t('ear-accessory',14.2,'accent',[.60,.50],[.76,.38],[.67,.31],-2),t('ear-accessory',14.2,'accent',[.60,.50],[.67,.31],[.60,.22],-5),t('ear-accessory',14.2,'accent',[.60,.50],[.53,.31],[.44,.38],-1)],
};

export function accessoryTriangles(kind:'headwear',id:HeadwearStyleId):readonly AccessoryTriangle[];
export function accessoryTriangles(kind:'eyewear',id:EyewearStyleId):readonly AccessoryTriangle[];
export function accessoryTriangles(kind:'faceDetail',id:FaceDetailStyleId):readonly AccessoryTriangle[];
export function accessoryTriangles(kind:'earAccessory',id:EarAccessoryStyleId):readonly AccessoryTriangle[];
export function accessoryTriangles(kind:'headwear'|'eyewear'|'faceDetail'|'earAccessory',id:string):readonly AccessoryTriangle[]{
  if(id==='none')return[];
  const quality=qualityAccessoryTriangles(kind,id);
  if(quality)return quality;
  if(kind==='headwear')return HEADWEAR[id as Exclude<HeadwearStyleId,'none'>]??[];
  if(kind==='eyewear')return EYEWEAR[id as Exclude<EyewearStyleId,'none'>]??[];
  if(kind==='faceDetail')return FACE_DETAIL[id as Exclude<FaceDetailStyleId,'none'>]??[];
  return EAR[id as Exclude<EarAccessoryStyleId,'none'>]??[];
}
