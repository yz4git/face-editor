import type { ColorRole,Vec2 } from '../core/types';
import type { EarAccessoryStyleId,EyewearStyleId,FaceDetailStyleId,HeadwearStyleId } from '../core/characterExpansion';

export interface QualityAccessoryTriangle{layer:string;zIndex:number;colorRole:ColorRole;shade:number;points:readonly[Vec2,Vec2,Vec2]}
const t=(layer:string,z:number,role:ColorRole,a:Vec2,b:Vec2,c:Vec2,shade=0):QualityAccessoryTriangle=>({layer,zIndex:z,colorRole:role,shade,points:[a,b,c]});
const q=(layer:string,z:number,role:ColorRole,a:Vec2,b:Vec2,c:Vec2,d:Vec2,shade=0):QualityAccessoryTriangle[]=>[t(layer,z,role,a,b,c,shade),t(layer,z,role,a,c,d,shade-4)];
const rect=(layer:string,z:number,role:ColorRole,x1:number,y1:number,x2:number,y2:number,shade=0)=>q(layer,z,role,[x1,y1],[x2,y1],[x2,y2],[x1,y2],shade);
const ellipseRing=(layer:string,z:number,role:ColorRole,cx:number,cy:number,rx:number,ry:number,thickness:number,segments=18,shade=0)=>{
  const out:QualityAccessoryTriangle[]=[];
  for(let i=0;i<segments;i++){
    const a=Math.PI*2*i/segments,b=Math.PI*2*(i+1)/segments;
    const oa:Vec2=[cx+Math.cos(a)*rx,cy+Math.sin(a)*ry],ob:Vec2=[cx+Math.cos(b)*rx,cy+Math.sin(b)*ry];
    const ia:Vec2=[cx+Math.cos(a)*(rx-thickness),cy+Math.sin(a)*(ry-thickness)],ib:Vec2=[cx+Math.cos(b)*(rx-thickness),cy+Math.sin(b)*(ry-thickness)];
    out.push(...q(layer,z,role,oa,ob,ib,ia,shade-(i%4)));
  }
  return out;
};
const ellipseFill=(layer:string,z:number,role:ColorRole,cx:number,cy:number,rx:number,ry:number,start:number,end:number,segments=18,shade=0)=>{
  const out:QualityAccessoryTriangle[]=[],center:Vec2=[cx,cy];
  for(let i=0;i<segments;i++){
    const a=start+(end-start)*i/segments,b=start+(end-start)*(i+1)/segments;
    out.push(t(layer,z,role,center,[cx+Math.cos(a)*rx,cy+Math.sin(a)*ry],[cx+Math.cos(b)*rx,cy+Math.sin(b)*ry],shade-(i%5)));
  }
  return out;
};
const arcBand=(layer:string,z:number,role:ColorRole,cx:number,cy:number,outerRx:number,outerRy:number,innerRx:number,innerRy:number,start:number,end:number,segments=16,shade=0)=>{
  const out:QualityAccessoryTriangle[]=[];
  for(let i=0;i<segments;i++){
    const a=start+(end-start)*i/segments,b=start+(end-start)*(i+1)/segments;
    const oa:Vec2=[cx+Math.cos(a)*outerRx,cy+Math.sin(a)*outerRy],ob:Vec2=[cx+Math.cos(b)*outerRx,cy+Math.sin(b)*outerRy];
    const ia:Vec2=[cx+Math.cos(a)*innerRx,cy+Math.sin(a)*innerRy],ib:Vec2=[cx+Math.cos(b)*innerRx,cy+Math.sin(b)*innerRy];
    out.push(...q(layer,z,role,oa,ob,ib,ia,shade-(i%4)));
  }
  return out;
};
const diamond=(layer:string,z:number,role:ColorRole,cx:number,cy:number,rx:number,ry:number,shade=0)=>[t(layer,z,role,[cx,cy+ry],[cx+rx,cy],[cx,cy-ry],shade),t(layer,z,role,[cx,cy+ry],[cx,cy-ry],[cx-rx,cy],shade-5)];

const HEADWEAR:Record<Exclude<HeadwearStyleId,'none'>,QualityAccessoryTriangle[]>={
  cap:[
    ...ellipseFill('headwear',17,'jacket',0,1.47,.58,.34,0,Math.PI,18,2),
    ...arcBand('headwear',17.05,'jacket',0,1.43,.59,.30,.50,.22,.08,Math.PI-.08,16,-4),
    ...q('headwear',17.1,'accent',[-.08,1.42],[.55,1.43],[.88,1.34],[.17,1.35],3),
    ...rect('headwear',17.15,'accent',-.045,1.69,.045,1.55,-2),
  ],
  beanie:[
    ...ellipseFill('headwear',17,'jacket',0,1.39,.57,.48,0,Math.PI,22,1),
    ...arcBand('headwear',17.05,'jacket',0,1.37,.58,.36,.51,.27,.04,Math.PI-.04,18,-5),
    ...q('headwear',17.1,'jacket',[-.54,1.37],[.54,1.37],[.50,1.22],[-.50,1.22],-7),
    ...rect('headwear',17.12,'accent',-.48,1.315,.48,1.275,-1),
    ...ellipseFill('headwear',17.13,'accent',0,1.82,.065,.055,0,Math.PI*2,12,-2),
  ],
  beret:[
    ...ellipseFill('headwear',17,'jacket',.04,1.50,.64,.28,0,Math.PI*2,22,1),
    ...q('headwear',17.03,'jacket',[-.51,1.49],[.56,1.53],[.38,1.34],[-.40,1.33],-7),
    ...rect('headwear',17.1,'accent',-.05,1.74,.03,1.61,-2),
  ],
  headband:[
    ...arcBand('headwear',17,'accent',0,1.19,.61,.49,.53,.41,.18,Math.PI-.18,20,2),
    ...rect('headwear',17.05,'accent',-.57,1.37,-.50,1.23,-3),...rect('headwear',17.05,'accent',.50,1.37,.57,1.23,-6),
  ],
  headphones:[
    ...arcBand('headwear',16.85,'metal',0,1.18,.69,.61,.61,.53,.10,Math.PI-.10,24,-2),
    ...ellipseFill('headwear',17,'metal',-.62,1.02,.13,.24,0,Math.PI*2,14,-2),...ellipseFill('headwear',17,'metal',.62,1.02,.13,.24,0,Math.PI*2,14,-7),
    ...q('headwear',17.1,'accent',[-.68,1.16],[-.60,1.18],[-.58,.90],[-.66,.88],3),...q('headwear',17.1,'accent', [.60,1.18],[.68,1.16],[.66,.88],[.58,.90],-2),
  ],
  'goggles-up':[
    ...ellipseRing('headwear',17,'metal',-.25,1.43,.23,.14,.035,14,-2),...ellipseRing('headwear',17,'metal',.25,1.43,.23,.14,.035,14,-6),
    ...rect('headwear',17.02,'metal',-.055,1.455,.055,1.425,-3),
    ...arcBand('headwear',16.95,'accent',0,1.42,.58,.17,.53,.12,.05,Math.PI-.05,18,-1),
  ],
  'small-crown':[
    t('headwear',17,'accent',[-.31,1.52],[-.24,1.84],[-.10,1.61],2),t('headwear',17,'accent',[-.10,1.61],[0,1.94],[.11,1.61],-1),t('headwear',17,'accent',[.11,1.61],[.25,1.84],[.32,1.51],-5),
    ...q('headwear',17,'accent',[-.31,1.52],[.32,1.51],[.26,1.39],[-.25,1.40],-3),
    ...ellipseFill('headwear',17.12,'white',-.20,1.58,.035,.035,0,Math.PI*2,8,1),...ellipseFill('headwear',17.12,'white',0,1.63,.035,.035,0,Math.PI*2,8,1),...ellipseFill('headwear',17.12,'white',.20,1.58,.035,.035,0,Math.PI*2,8,1),
  ],
  'sci-fi-visor':[
    ...arcBand('headwear',17,'metal',0,1.26,.66,.37,.58,.29,.15,Math.PI-.15,20,-4),
    ...q('headwear',17.08,'accent',[-.46,1.50],[-.12,1.58],[.46,1.49],[.17,1.38],4),
    ...q('headwear',17.09,'pupil',[-.38,1.48],[.39,1.47],[.29,1.37],[-.24,1.38],-6),
    ...rect('headwear',17,'metal',-.64,1.42,-.56,1.23,-4),...rect('headwear',17,'metal',.56,1.42,.64,1.23,-8),
  ],
};

const EYEWEAR:Partial<Record<Exclude<EyewearStyleId,'none'>,QualityAccessoryTriangle[]>>={
  'round-glasses':[...ellipseRing('eyewear',13.6,'metal',-.30,.64,.22,.16,.028,18,-2),...ellipseRing('eyewear',13.6,'metal',.30,.64,.22,.16,.028,18,-5),...rect('eyewear',13.62,'metal',-.10,.665,.10,.635,-3)],
  monocle:[...ellipseRing('eyewear',13.6,'metal',.30,.64,.23,.17,.027,18,-2),...rect('eyewear',13.55,'metal',.49,.51,.515,.10,-4),...diamond('eyewear',13.62,'accent',.503,.06,.042,.055,-2)],
  'sport-goggles':[
    ...arcBand('eyewear',13.5,'metal',-.29,.63,.28,.20,.22,.14,.10,Math.PI-.10,14,-3),...arcBand('eyewear',13.5,'metal',.29,.63,.28,.20,.22,.14,.10,Math.PI-.10,14,-7),
    ...q('eyewear',13.62,'accent',[-.47,.70],[-.14,.73],[-.17,.55],[-.44,.56],3),...q('eyewear',13.62,'accent',[.14,.73],[.47,.70],[.44,.56],[.17,.55],-1),
  ],
};

const FACE_DETAIL:Partial<Record<Exclude<FaceDetailStyleId,'none'>,QualityAccessoryTriangle[]>>={
  freckles:[
    ...[-.39,-.31,-.23,.23,.31,.39].flatMap((x,index)=>ellipseFill('face-detail',12.8,'brows',x,.40+(index%2)*.025,.020,.015,0,Math.PI*2,8,-6-(index%3))),
  ],
  blush:[...ellipseFill('face-detail',12.7,'tongue',-.36,.34,.16,.085,0,Math.PI*2,12,9),...ellipseFill('face-detail',12.7,'tongue',.36,.34,.16,.085,0,Math.PI*2,12,4)],
  'under-eye-line':[...arcBand('face-detail',12.9,'pupil',-.30,.56,.20,.11,.18,.085,.15,Math.PI-.15,10,-4),...arcBand('face-detail',12.9,'pupil',.30,.56,.20,.11,.18,.085,.15,Math.PI-.15,10,-7)],
};

const EAR:Partial<Record<Exclude<EarAccessoryStyleId,'none'>,QualityAccessoryTriangle[]>>={
  'hoop-earring':[...ellipseRing('ear-accessory',14.2,'metal',.61,.39,.105,.16,.022,18,-3)],
  'chain-earring':[...diamond('ear-accessory',14.2,'accent',.59,.56,.035,.035,2),...rect('ear-accessory',14.2,'metal',.590,.52,.607,.22,-4),...ellipseFill('ear-accessory',14.25,'accent',.598,.16,.05,.065,0,Math.PI*2,10,-2)],
  'star-earring':[
    t('ear-accessory',14.2,'accent',[.60,.52],[.64,.40],[.76,.40],2),t('ear-accessory',14.2,'accent',[.60,.52],[.76,.40],[.67,.32],-2),t('ear-accessory',14.2,'accent',[.60,.52],[.67,.32],[.60,.20],-5),t('ear-accessory',14.2,'accent',[.60,.52],[.53,.32],[.44,.40],-1),t('ear-accessory',14.2,'accent',[.60,.52],[.44,.40],[.56,.40],1),
  ],
};

export function qualityAccessoryTriangles(kind:'headwear'|'eyewear'|'faceDetail'|'earAccessory',id:string):readonly QualityAccessoryTriangle[]|null{
  if(id==='none')return [];
  if(kind==='headwear')return HEADWEAR[id as Exclude<HeadwearStyleId,'none'>]??null;
  if(kind==='eyewear')return EYEWEAR[id as Exclude<EyewearStyleId,'none'>]??null;
  if(kind==='faceDetail')return FACE_DETAIL[id as Exclude<FaceDetailStyleId,'none'>]??null;
  return EAR[id as Exclude<EarAccessoryStyleId,'none'>]??null;
}
