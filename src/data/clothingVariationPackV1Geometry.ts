import type { Vec2 } from '../core/types';

/**
 * Clothing Variation Pack v1
 *
 * Normalized triangle data authored from the generated clothing source sheet for
 * this editor.  The source art is intentionally treated as authoring reference
 * only; runtime continues to use texture-free triangle geometry.
 */
export type ClothingPackV1Kind='outfit'|'hood'|'shirt'|'strap'|'accent';
export type ClothingPackV1Role='jacket'|'hood'|'shirt'|'strap'|'metal'|'accent';
export interface ClothingPackV1Triangle{role:ClothingPackV1Role;shade:number;points:readonly[Vec2,Vec2,Vec2]}

type Tri=ClothingPackV1Triangle;
const tri=(role:ClothingPackV1Role,shade:number,a:Vec2,b:Vec2,c:Vec2):Tri=>({role,shade,points:[a,b,c]});
const quad=(role:ClothingPackV1Role,shade:number,a:Vec2,b:Vec2,c:Vec2,d:Vec2):Tri[]=>[tri(role,shade,a,b,c),tri(role,shade,a,c,d)];
const mirror=(p:Vec2):Vec2=>[-p[0],p[1]];
const mirrorQuad=(role:ClothingPackV1Role,shade:number,a:Vec2,b:Vec2,c:Vec2,d:Vec2):Tri[]=>[
  ...quad(role,shade,a,b,c,d),...quad(role,shade,mirror(a),mirror(d),mirror(c),mirror(b)),
];
const fan=(role:ClothingPackV1Role,shade:number,points:readonly Vec2[]):Tri[]=>{
  if(points.length<3)return[];const out:Tri[]=[];for(let i=1;i<points.length-1;i++)out.push(tri(role,shade,points[0],points[i],points[i+1]));return out;
};

const sleeves=(outerX:number,wristX:number,wristY:number,shadeL=-5,shadeR=3):Tri[]=>[
  ...quad('jacket',shadeL,[-.46,-.46],[-outerX,-.64],[-wristX,wristY],[-.51,wristY+.10]),
  ...quad('jacket',shadeR,[.46,-.46],[outerX,-.64],[wristX,wristY],[.51,wristY+.10]),
];
const torso=(topX:number,waistX:number,hemX:number,hemY:number,shade=0):Tri[]=>[
  tri('jacket',shade,[-topX,-.43],[topX,-.43],[hemX,hemY]),
  tri('jacket',shade,[-topX,-.43],[hemX,hemY],[-hemX,hemY]),
  ...quad('jacket',shade-7,[-topX,-.43],[-.05,-.43],[-.04,hemY],[-hemX,hemY]),
  ...quad('jacket',shade+4,[.05,-.43],[topX,-.43],[hemX,hemY],[.04,hemY]),
  ...quad('jacket',shade-3,[-waistX,-1.06],[waistX,-1.06],[hemX,hemY],[-hemX,hemY]),
];

function blazer():Tri[]{return[
  ...sleeves(.98,.77,-1.68,-7,2),...torso(.55,.49,.53,-1.79,0),
  ...fan('jacket',-16,[[-.42,-.44],[-.08,-.48],[-.20,-1.16],[-.48,-.76]]),
  ...fan('jacket',8,[[.42,-.44],[.08,-.48],[.20,-1.16],[.48,-.76]]),
  ...quad('jacket',-12,[-.48,-1.32],[-.18,-1.32],[-.17,-1.39],[-.48,-1.39]),
  ...quad('jacket',6,[[.18,-1.32],[.48,-1.32],[.48,-1.39],[.17,-1.39]),
] as Tri[];}

function bomber():Tri[]{return[
  ...sleeves(1.08,.82,-1.58,-4,5),...torso(.60,.57,.58,-1.57,-1),
  ...quad('jacket',-15,[-.58,-1.48],[.58,-1.48],[.55,-1.61],[-.55,-1.61]),
  ...quad('jacket',-11,[-.84,-1.47],[-.68,-1.47],[-.66,-1.60],[-.82,-1.60]),
  ...quad('jacket',4,[[.68,-1.47],[.84,-1.47],[.82,-1.60],[.66,-1.60]),
  ...quad('jacket',-9,[-.50,-.77],[-.28,-.95],[-.33,-1.02],[-.55,-.84]),
  ...quad('jacket',7,[[.50,-.77],[.28,-.95],[.33,-1.02],[.55,-.84]),
] as Tri[];}

function longCoat():Tri[]{return[
  ...sleeves(.98,.75,-1.72,-8,2),
  ...fan('jacket',-2,[[-.55,-.43],[.55,-.43],[.48,-1.20],[.72,-2.36],[.10,-2.42],[0,-1.18],[-.10,-2.42],[-.72,-2.36],[-.48,-1.20]]),
  ...quad('jacket',-15,[-.45,-.44],[-.08,-.48],[-.04,-1.40],[-.30,-1.08]),
  ...quad('jacket',7,[[.45,-.44],[.08,-.48],[.04,-1.40],[.30,-1.08]),
  ...quad('jacket',-10,[-.72,-2.36],[-.10,-2.42],[-.07,-2.30],[-.65,-2.24]),
  ...quad('jacket',4,[[.10,-2.42],[.72,-2.36],[.65,-2.24],[.07,-2.30]),
] as Tri[];}

function tacticalJacket():Tri[]{return[
  ...sleeves(1.04,.80,-1.70,-6,4),...torso(.61,.58,.59,-1.83,-2),
  ...quad('jacket',-14,[-.58,-.54],[-.08,-.54],[-.08,-.92],[-.54,-.88]),
  ...quad('jacket',7,[[.08,-.54],[.58,-.54],[.54,-.88],[.08,-.92]),
  ...quad('jacket',-18,[-.51,-1.00],[-.12,-1.00],[-.14,-1.35],[-.52,-1.31]),
  ...quad('jacket',4,[[.12,-1.00],[.51,-1.00],[.52,-1.31],[.14,-1.35]),
  ...quad('jacket',-12,[-.95,-.73],[-.77,-.79],[-.74,-1.02],[-.91,-.98]),
  ...quad('jacket',8,[[.77,-.79],[.95,-.73],[.91,-.98],[.74,-1.02]),
] as Tri[];}

function croppedJacket():Tri[]{return[
  ...sleeves(1.00,.78,-1.54,-5,4),...torso(.57,.53,.55,-1.28,0),
  ...quad('jacket',-15,[-.55,-1.18],[.55,-1.18],[.52,-1.32],[-.52,-1.32]),
  ...fan('jacket',-10,[[-.47,-.47],[-.10,-.47],[-.20,-.93],[-.50,-.75]]),
  ...fan('jacket',6,[[.47,-.47],[.10,-.47],[.20,-.93],[.50,-.75]]),
  ...quad('jacket',-8,[-.88,-1.37],[-.72,-1.40],[-.70,-1.54],[-.86,-1.51]),
  ...quad('jacket',6,[[.72,-1.40],[.88,-1.37],[.86,-1.51],[.70,-1.54]),
] as Tri[];}

function techParka():Tri[]{return[
  ...sleeves(1.10,.84,-1.72,-7,3),...torso(.64,.61,.63,-1.91,-1),
  ...fan('jacket',-16,[[-.62,-.48],[-.09,-.48],[-.16,-1.16],[-.58,-1.35],[-.65,-.89]]),
  ...fan('jacket',8,[[.62,-.48],[.09,-.48],[.16,-1.16],[.58,-1.35],[.65,-.89]]),
  ...quad('jacket',-12,[-.58,-1.42],[-.18,-1.48],[-.16,-1.72],[-.60,-1.68]),
  ...quad('jacket',5,[[.18,-1.48],[.58,-1.42],[.60,-1.68],[.16,-1.72]),
  ...quad('jacket',10,[[-.05,-.50],[.05,-.50],[.04,-1.86],[-.04,-1.86]),
] as Tri[];}

const OUTFITS:Record<string,()=>Tri[]>={blazer,bomber,'long-coat':longCoat,'tactical-jacket':tacticalJacket,'cropped-jacket':croppedJacket,'tech-parka':techParka};

const hoodOpenCollar=():Tri[]=>[
  ...fan('hood',-5,[[-.44,-.44],[-.12,-.25],[-.02,-.48],[-.24,-.70]]),
  ...fan('hood',4,[[.44,-.44],[.12,-.25],[.02,-.48],[.24,-.70]]),
];
const hoodStandCollar=():Tri[]=>[
  ...quad('hood',-7,[-.42,-.45],[-.20,-.22],[-.12,-.55],[-.38,-.65]),...quad('hood',3,[[.20,-.22],[.42,-.45],[.38,-.65],[.12,-.55]),
  ...quad('hood',-2,[-.20,-.22],[.20,-.22],[.12,-.55],[-.12,-.55]),
];
const hoodFurCollar=():Tri[]=>{
  const out:Tri[]=[];for(let i=0;i<8;i++){const x0=-.54+i*.135,x1=x0+.15,y=-.46-(i%2)*.055;out.push(tri('hood',i%2?-9:8,[x0,-.43],[x1,-.43],[(x0+x1)/2,y-.22]));}return out;
};
const hoodDoubleCollar=():Tri[]=>[
  ...hoodOpenCollar(),...quad('hood',-12,[-.50,-.48],[-.24,-.37],[-.16,-.58],[-.42,-.70]),...quad('hood',7,[[.24,-.37],[.50,-.48],[.42,-.70],[.16,-.58]),
];
const hoodHighWrap=():Tri[]=>[
  ...quad('hood',-8,[-.46,-.46],[-.32,-.16],[.10,-.24],[-.08,-.62]),...quad('hood',4,[[-.10,-.24],[.32,-.16],[.46,-.46],[.08,-.62]),
  tri('hood',-13,[-.32,-.16],[.32,-.16],[-.10,-.24]),
];
const hoodSplitLapel=():Tri[]=>[
  ...fan('hood',-8,[[-.50,-.45],[-.10,-.24],[-.18,-.72],[-.45,-.85]]),...fan('hood',6,[[.50,-.45],[.10,-.24],[.18,-.72],[.45,-.85]]),
];
const HOODS:Record<string,()=>Tri[]>={'open-collar':hoodOpenCollar,'stand-collar':hoodStandCollar,'fur-collar':hoodFurCollar,'double-collar':hoodDoubleCollar,'high-wrap':hoodHighWrap,'split-lapel':hoodSplitLapel};

const shirtBase=(neckX=.18,hem=-1.82):Tri[]=>[
  tri('shirt',0,[[-neckX,-.42],[neckX,-.42],[.42,hem]]),tri('shirt',-6,[[-neckX,-.42],[.42,hem],[-.42,hem]]),
];
const SHIRTS:Record<string,()=>Tri[]>={
  'dress-shirt':()=>[...shirtBase(.16),...fan('shirt',8,[[-.16,-.42],[0,-.62],[-.25,-.74]]),...fan('shirt',-7,[[.16,-.42],[0,-.62],[.25,-.74]]),...quad('shirt',9,[[-.025,-.58],[.025,-.58],[.022,-1.80],[-.022,-1.80])],
  henley:()=>[...shirtBase(.20),...quad('shirt',8,[[-.08,-.43],[.08,-.43],[.07,-.84],[-.07,-.84]),...quad('shirt',-10,[[-.06,-.61],[.06,-.61],[.06,-.65],[-.06,-.65])],
  sweater:()=>[...shirtBase(.23),...quad('shirt',-10,[[-.42,-1.68],[.42,-1.68],[.40,-1.82],[-.40,-1.82]),...quad('shirt',7,[[-.23,-.44],[.23,-.44],[.19,-.57],[-.19,-.57])],
  'hoodie-inner':()=>[...shirtBase(.24),...quad('shirt',-12,[[-.24,-.43],[.24,-.43],[.18,-.63],[-.18,-.63]),...mirrorQuad('shirt',5,[-.18,-.54],[-.10,-.55],[-.12,-1.02],[-.16,-1.02])],
  'vest-inner':()=>[...shirtBase(.14),...quad('shirt',-10,[[-.38,-.48],[-.18,-.43],[-.14,-1.75],[-.36,-1.80]),...quad('shirt',5,[[.18,-.43],[.38,-.48],[.36,-1.80],[.14,-1.75])],
  'utility-top':()=>[...shirtBase(.20),...quad('shirt',-13,[[-.38,-.72],[-.08,-.72],[-.08,-1.03],[-.38,-1.03]),...quad('shirt',7,[[.08,-.72],[.38,-.72],[.38,-1.03],[.08,-1.03]),...quad('shirt',9,[[-.03,-.43],[.03,-.43],[.03,-1.78],[-.03,-1.78])],
};

const strapStrip=(a:Vec2,b:Vec2,width=.07,shade=0):Tri[]=>{const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len*width,ny=dx/len*width;return quad('strap',shade,[a[0]+nx,a[1]+ny],[a[0]-nx,a[1]-ny],[b[0]-nx,b[1]-ny],[b[0]+nx,b[1]+ny]);};
const pouch=(x:number,y:number,w=.25,h=.34):Tri[]=>[
  ...quad('strap',-8,[x-w/2,y+h/2],[x+w/2,y+h/2],[x+w/2,y-h/2],[x-w/2,y-h/2]),
  ...quad('metal',8,[x-.04,y+.04],[x+.04,y+.04],[x+.04,y-.03],[x-.04,y-.03]),
];
const STRAPS:Record<string,()=>Tri[]>={
  'chest-rig':()=>[...strapStrip([-.40,-.46],[-.12,-1.24],.075,-4),...strapStrip([.40,-.46],[.12,-1.24],.075,4),...strapStrip([-.34,-1.18],[.34,-1.18],.07,-8),...pouch(-.26,-1.10,.25,.30),...pouch(.26,-1.10,.25,.30)],
  'shoulder-brace':()=>[...strapStrip([-.42,-.43],[.24,-1.56],.085,-5),...strapStrip([.38,-.46],[.42,-1.25],.055,4),...pouch(.37,-1.36,.22,.30)],
  'belt-pack':()=>[...strapStrip([-.48,-1.46],[.48,-1.46],.065,-8),...pouch(-.32,-1.50,.28,.29),...pouch(.32,-1.50,.28,.29)],
  'asymmetric-strap':()=>[...strapStrip([-.43,-.46],[.34,-1.68],.08,-5),...pouch(.25,-1.45,.24,.31)],
  'tech-harness':()=>[...strapStrip([-.40,-.46],[-.08,-1.08],.06,-5),...strapStrip([.40,-.46],[.08,-1.08],.06,5),...strapStrip([-.08,-1.08],[-.32,-1.68],.06,-7),...strapStrip([.08,-1.08],[.32,-1.68],.06,6),...quad('metal',10,[[-.09,-1.02],[.09,-1.02],[.09,-1.18],[-.09,-1.18])],
  'layered-pouch':()=>[...strapStrip([-.45,-1.28],[.45,-1.28],.055,-8),...pouch(-.38,-1.32,.24,.34),...pouch(-.12,-1.36,.22,.28),...pouch(.18,-1.34,.24,.32),...pouch(.40,-1.30,.20,.26)],
};

const accentRect=(x:number,y:number,w:number,h:number,shade=0):Tri[]=>quad('accent',shade,[x-w/2,y+h/2],[x+w/2,y+h/2],[x+w/2,y-h/2],[x-w/2,y-h/2]);
const ACCENTS:Record<string,()=>Tri[]>={
  'panel-line':()=>[...quad('accent',2,[[-.48,-.73],[-.12,-.73],[-.12,-.78],[-.48,-.78]),...quad('accent',8,[[.12,-.73],[.48,-.73],[.48,-.78],[.12,-.78])],
  'arm-band':()=>[...quad('accent',0,[[-.93,-.92],[-.73,-.98],[-.70,-1.08],[-.90,-1.02]),...quad('accent',5,[[.73,-.98],[.93,-.92],[.90,-1.02],[.70,-1.08])],
  badge:()=>[...accentRect(.31,-.78,.20,.16,5),tri('accent',12,[.31,-.70],[.38,-.78],[.31,-.86]),tri('accent',-6,[.31,-.70],[.31,-.86],[.24,-.78])],
  'zip-line':()=>[...quad('accent',6,[[-.035,-.46],[.035,-.46],[.028,-1.78],[-.028,-1.78]),...accentRect(0,-1.16,.12,.06,-5)],
  'belt-buckle':()=>[...quad('accent',-4,[[-.47,-1.55],[.47,-1.55],[.47,-1.64],[-.47,-1.64]),...quad('metal',10,[[-.13,-1.50],[.13,-1.50],[.13,-1.69],[-.13,-1.69])],
  'tech-emblem':()=>[tri('accent',8,[.27,-.72],[.43,-.86],[.32,-1.04]),tri('accent',-8,[.27,-.72],[.32,-1.04],[.18,-.89]),...accentRect(.305,-.88,.08,.08,14)],
};

export const CLOTHING_PACK_V1_IDS={
  outfit:Object.freeze(Object.keys(OUTFITS)),hood:Object.freeze(Object.keys(HOODS)),shirt:Object.freeze(Object.keys(SHIRTS)),strap:Object.freeze(Object.keys(STRAPS)),accent:Object.freeze(Object.keys(ACCENTS)),
} as const;

export function clothingPackV1Triangles(kind:ClothingPackV1Kind,id:string):readonly ClothingPackV1Triangle[]{
  const table:Record<ClothingPackV1Kind,Record<string,()=>Tri[]>>={outfit:OUTFITS,hood:HOODS,shirt:SHIRTS,strap:STRAPS,accent:ACCENTS};
  const build=table[kind][id];if(!build)throw new Error(`No Clothing Variation Pack v1 geometry for ${kind}:${id}`);return build();
}
