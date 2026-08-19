import type { Vec2 } from '../core/types';

/**
 * Clothing Variation Pack v1
 *
 * Image-derived normalized geometry based on the generated clothing reference
 * sheet. Runtime remains texture-free; the source image is authoring reference
 * only and every selectable item is emitted as finite triangle data.
 */
export type ClothingPackV1Kind='outfit'|'hood'|'shirt'|'strap'|'accent';
export type ClothingPackV1Role='jacket'|'hood'|'shirt'|'strap'|'metal'|'accent';
export interface ClothingPackV1Triangle{role:ClothingPackV1Role;shade:number;points:readonly[Vec2,Vec2,Vec2]}

type Tri=ClothingPackV1Triangle;
const v=(x:number,y:number):Vec2=>[x,y];
const tri=(role:ClothingPackV1Role,shade:number,a:Vec2,b:Vec2,c:Vec2):Tri=>({role,shade,points:[a,b,c]});
const quad=(role:ClothingPackV1Role,shade:number,a:Vec2,b:Vec2,c:Vec2,d:Vec2):Tri[]=>[
  tri(role,shade,a,b,c),tri(role,shade,a,c,d),
];
const rect=(role:ClothingPackV1Role,shade:number,cx:number,cy:number,w:number,h:number):Tri[]=>quad(role,shade,v(cx-w/2,cy+h/2),v(cx+w/2,cy+h/2),v(cx+w/2,cy-h/2),v(cx-w/2,cy-h/2));
const mirror=(p:Vec2):Vec2=>v(-p[0],p[1]);
const mirroredQuad=(role:ClothingPackV1Role,shade:number,a:Vec2,b:Vec2,c:Vec2,d:Vec2):Tri[]=>[
  ...quad(role,shade,a,b,c,d),...quad(role,shade,mirror(a),mirror(d),mirror(c),mirror(b)),
];

interface OutfitRecipe{topX:number;outerX:number;wristX:number;wristY:number;hemX:number;hemY:number;waistX:number;detail:'lapel'|'rib'|'long'|'tactical'|'crop'|'tech'}
const OUTFIT_RECIPES:Record<string,OutfitRecipe>={
  blazer:{topX:.55,outerX:.98,wristX:.77,wristY:-1.68,hemX:.53,hemY:-1.79,waistX:.49,detail:'lapel'},
  bomber:{topX:.60,outerX:1.08,wristX:.82,wristY:-1.58,hemX:.58,hemY:-1.57,waistX:.57,detail:'rib'},
  'long-coat':{topX:.55,outerX:.98,wristX:.75,wristY:-1.72,hemX:.72,hemY:-2.36,waistX:.48,detail:'long'},
  'tactical-jacket':{topX:.61,outerX:1.04,wristX:.80,wristY:-1.70,hemX:.59,hemY:-1.83,waistX:.58,detail:'tactical'},
  'cropped-jacket':{topX:.57,outerX:1.00,wristX:.78,wristY:-1.54,hemX:.55,hemY:-1.28,waistX:.53,detail:'crop'},
  'tech-parka':{topX:.64,outerX:1.10,wristX:.84,wristY:-1.72,hemX:.63,hemY:-1.91,waistX:.61,detail:'tech'},
};

function outfitBase(r:OutfitRecipe):Tri[]{
  const out:Tri[]=[
    tri('jacket',0,v(-r.topX,-.43),v(r.topX,-.43),v(r.hemX,r.hemY)),
    tri('jacket',-6,v(-r.topX,-.43),v(r.hemX,r.hemY),v(-r.hemX,r.hemY)),
    ...quad('jacket',-7,v(-r.topX,-.43),v(-.03,-.43),v(-.03,r.hemY),v(-r.hemX,r.hemY)),
    ...quad('jacket',5,v(.03,-.43),v(r.topX,-.43),v(r.hemX,r.hemY),v(.03,r.hemY)),
    ...quad('jacket',-3,v(-r.waistX,-1.05),v(r.waistX,-1.05),v(r.hemX,r.hemY),v(-r.hemX,r.hemY)),
    ...quad('jacket',-5,v(-.46,-.46),v(-r.outerX,-.64),v(-r.wristX,r.wristY),v(-.51,r.wristY+.10)),
    ...quad('jacket',4,v(.46,-.46),v(r.outerX,-.64),v(r.wristX,r.wristY),v(.51,r.wristY+.10)),
  ];
  return out;
}
function outfitDetails(r:OutfitRecipe):Tri[]{
  switch(r.detail){
    case'lapel':return[
      ...quad('jacket',-15,v(-.45,-.45),v(-.08,-.48),v(-.18,-1.08),v(-.46,-.76)),
      ...quad('jacket',8,v(.08,-.48),v(.45,-.45),v(.46,-.76),v(.18,-1.08)),
      ...rect('jacket',-10,-.34,-1.35,.30,.08),...rect('jacket',6,.34,-1.35,.30,.08),
    ];
    case'rib':return[
      ...rect('jacket',-15,0,r.hemY+.05,1.12,.12),
      ...rect('jacket',-10,-.74,r.wristY+.04,.18,.12),...rect('jacket',5,.74,r.wristY+.04,.18,.12),
      ...quad('jacket',-9,v(-.52,-.78),v(-.28,-.95),v(-.33,-1.03),v(-.57,-.86)),
      ...quad('jacket',7,v(.28,-.95),v(.52,-.78),v(.57,-.86),v(.33,-1.03)),
    ];
    case'long':return[
      ...quad('jacket',-15,v(-.45,-.45),v(-.08,-.48),v(-.04,-1.42),v(-.30,-1.08)),
      ...quad('jacket',7,v(.08,-.48),v(.45,-.45),v(.30,-1.08),v(.04,-1.42)),
      ...quad('jacket',-10,v(-.68,-2.28),v(-.08,-2.38),v(-.05,-2.24),v(-.61,-2.16)),
      ...quad('jacket',4,v(.08,-2.38),v(.68,-2.28),v(.61,-2.16),v(.05,-2.24)),
    ];
    case'tactical':return[
      ...rect('jacket',-14,-.32,-.72,.44,.32),...rect('jacket',7,.32,-.72,.44,.32),
      ...rect('jacket',-18,-.31,-1.18,.38,.31),...rect('jacket',4,.31,-1.18,.38,.31),
      ...rect('jacket',-11,-.84,-.88,.18,.25),...rect('jacket',8,.84,-.88,.18,.25),
    ];
    case'crop':return[
      ...rect('jacket',-15,0,r.hemY+.05,1.06,.13),
      ...quad('jacket',-10,v(-.47,-.47),v(-.10,-.47),v(-.20,-.94),v(-.50,-.75)),
      ...quad('jacket',6,v(.10,-.47),v(.47,-.47),v(.50,-.75),v(.20,-.94)),
      ...rect('jacket',-8,-.79,r.wristY+.04,.16,.12),...rect('jacket',6,.79,r.wristY+.04,.16,.12),
    ];
    case'tech':return[
      ...quad('jacket',-16,v(-.61,-.49),v(-.09,-.49),v(-.16,-1.18),v(-.58,-1.36)),
      ...quad('jacket',8,v(.09,-.49),v(.61,-.49),v(.58,-1.36),v(.16,-1.18)),
      ...rect('jacket',-12,-.36,-1.58,.42,.24),...rect('jacket',5,.36,-1.58,.42,.24),
      ...rect('jacket',10,0,-1.14,.07,1.36),
    ];
  }
}
function buildOutfit(id:string):Tri[]{const r=OUTFIT_RECIPES[id];if(!r)throw new Error(`Unknown clothing outfit ${id}`);return[...outfitBase(r),...outfitDetails(r)];}

function buildHood(id:string):Tri[]{
  switch(id){
    case'open-collar':return[
      ...quad('hood',-6,v(-.46,-.44),v(-.12,-.25),v(-.02,-.48),v(-.25,-.70)),
      ...quad('hood',5,v(.12,-.25),v(.46,-.44),v(.25,-.70),v(.02,-.48)),
    ];
    case'stand-collar':return[
      ...quad('hood',-7,v(-.42,-.45),v(-.20,-.22),v(-.12,-.55),v(-.38,-.65)),
      ...quad('hood',4,v(.20,-.22),v(.42,-.45),v(.38,-.65),v(.12,-.55)),
      ...rect('hood',-2,0,-.39,.40,.30),
    ];
    case'fur-collar':{const out:Tri[]=[];for(let i=0;i<8;i++){const x=-.48+i*.137;out.push(tri('hood',i%2?-10:8,v(x,-.43),v(x+.16,-.43),v(x+.08,-.68-(i%2)*.04)));}return out;}
    case'double-collar':return[...buildHood('open-collar'),...mirroredQuad('hood',-11,v(-.50,-.48),v(-.25,-.37),v(-.16,-.58),v(-.42,-.70))];
    case'high-wrap':return[
      ...quad('hood',-8,v(-.46,-.46),v(-.32,-.16),v(.10,-.24),v(-.08,-.62)),
      ...quad('hood',4,v(-.10,-.24),v(.32,-.16),v(.46,-.46),v(.08,-.62)),
      tri('hood',-13,v(-.32,-.16),v(.32,-.16),v(-.10,-.24)),
    ];
    case'split-lapel':return[
      ...quad('hood',-8,v(-.50,-.45),v(-.10,-.24),v(-.18,-.72),v(-.45,-.85)),
      ...quad('hood',6,v(.10,-.24),v(.50,-.45),v(.45,-.85),v(.18,-.72)),
    ];
    default:throw new Error(`Unknown clothing hood ${id}`);
  }
}

const shirtBase=(neckX=.18,hem=-1.82):Tri[]=>[
  tri('shirt',0,v(-neckX,-.42),v(neckX,-.42),v(.42,hem)),tri('shirt',-6,v(-neckX,-.42),v(.42,hem),v(-.42,hem)),
];
function buildShirt(id:string):Tri[]{
  switch(id){
    case'dress-shirt':return[...shirtBase(.16),tri('shirt',8,v(-.16,-.42),v(0,-.62),v(-.25,-.74)),tri('shirt',-7,v(.16,-.42),v(.25,-.74),v(0,-.62)),...rect('shirt',9,0,-1.18,.05,1.22)];
    case'henley':return[...shirtBase(.20),...rect('shirt',8,0,-.64,.16,.42),...rect('shirt',-10,0,-.63,.12,.04)];
    case'sweater':return[...shirtBase(.23),...rect('shirt',-10,0,-1.74,.82,.14),...rect('shirt',7,0,-.50,.44,.13)];
    case'hoodie-inner':return[...shirtBase(.24),...rect('shirt',-12,0,-.53,.48,.20),...mirroredQuad('shirt',5,v(-.18,-.54),v(-.10,-.55),v(-.12,-1.02),v(-.16,-1.02))];
    case'vest-inner':return[...shirtBase(.14),...mirroredQuad('shirt',-9,v(-.38,-.48),v(-.18,-.43),v(-.14,-1.75),v(-.36,-1.80))];
    case'utility-top':return[...shirtBase(.20),...rect('shirt',-13,-.23,-.87,.30,.31),...rect('shirt',7,.23,-.87,.30,.31),...rect('shirt',9,0,-1.10,.06,1.34)];
    default:throw new Error(`Unknown clothing shirt ${id}`);
  }
}

function strapStrip(a:Vec2,b:Vec2,width=.07,shade=0):Tri[]{const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len*width,ny=dx/len*width;return quad('strap',shade,v(a[0]+nx,a[1]+ny),v(a[0]-nx,a[1]-ny),v(b[0]-nx,b[1]-ny),v(b[0]+nx,b[1]+ny));}
function pouch(x:number,y:number,w=.25,h=.34):Tri[]{return[...rect('strap',-8,x,y,w,h),...rect('metal',8,x,y+.02,.08,.07)];}
function buildStrap(id:string):Tri[]{
  switch(id){
    case'chest-rig':return[...strapStrip(v(-.40,-.46),v(-.12,-1.24),.075,-4),...strapStrip(v(.40,-.46),v(.12,-1.24),.075,4),...strapStrip(v(-.34,-1.18),v(.34,-1.18),.07,-8),...pouch(-.26,-1.10),...pouch(.26,-1.10)];
    case'shoulder-brace':return[...strapStrip(v(-.42,-.43),v(.24,-1.56),.085,-5),...strapStrip(v(.38,-.46),v(.42,-1.25),.055,4),...pouch(.37,-1.36,.22,.30)];
    case'belt-pack':return[...strapStrip(v(-.48,-1.46),v(.48,-1.46),.065,-8),...pouch(-.32,-1.50,.28,.29),...pouch(.32,-1.50,.28,.29)];
    case'asymmetric-strap':return[...strapStrip(v(-.43,-.46),v(.34,-1.68),.08,-5),...pouch(.25,-1.45,.24,.31)];
    case'tech-harness':return[...strapStrip(v(-.40,-.46),v(-.08,-1.08),.06,-5),...strapStrip(v(.40,-.46),v(.08,-1.08),.06,5),...strapStrip(v(-.08,-1.08),v(-.32,-1.68),.06,-7),...strapStrip(v(.08,-1.08),v(.32,-1.68),.06,6),...rect('metal',10,0,-1.10,.18,.16)];
    case'layered-pouch':return[...strapStrip(v(-.45,-1.28),v(.45,-1.28),.055,-8),...pouch(-.38,-1.32,.24,.34),...pouch(-.12,-1.36,.22,.28),...pouch(.18,-1.34,.24,.32),...pouch(.40,-1.30,.20,.26)];
    default:throw new Error(`Unknown clothing strap ${id}`);
  }
}

function buildAccent(id:string):Tri[]{
  switch(id){
    case'panel-line':return[...rect('accent',2,-.30,-.75,.36,.05),...rect('accent',8,.30,-.75,.36,.05)];
    case'arm-band':return[...quad('accent',0,v(-.93,-.92),v(-.73,-.98),v(-.70,-1.08),v(-.90,-1.02)),...quad('accent',5,v(.73,-.98),v(.93,-.92),v(.90,-1.02),v(.70,-1.08))];
    case'badge':return[...rect('accent',5,.31,-.78,.20,.16),tri('accent',12,v(.31,-.69),v(.39,-.78),v(.31,-.88)),tri('accent',-6,v(.31,-.69),v(.31,-.88),v(.23,-.78))];
    case'zip-line':return[...rect('accent',6,0,-1.14,.07,1.34),...rect('accent',-5,0,-1.16,.12,.06)];
    case'belt-buckle':return[...rect('accent',-4,0,-1.60,.94,.09),...rect('metal',10,0,-1.60,.26,.19)];
    case'tech-emblem':return[tri('accent',8,v(.27,-.70),v(.43,-.86),v(.32,-1.04)),tri('accent',-8,v(.27,-.70),v(.32,-1.04),v(.18,-.89)),...rect('accent',14,.305,-.88,.08,.08)];
    default:throw new Error(`Unknown clothing accent ${id}`);
  }
}

export const CLOTHING_PACK_V1_IDS={
  outfit:['blazer','bomber','long-coat','tactical-jacket','cropped-jacket','tech-parka'],
  hood:['open-collar','stand-collar','fur-collar','double-collar','high-wrap','split-lapel'],
  shirt:['dress-shirt','henley','sweater','hoodie-inner','vest-inner','utility-top'],
  strap:['chest-rig','shoulder-brace','belt-pack','asymmetric-strap','tech-harness','layered-pouch'],
  accent:['panel-line','arm-band','badge','zip-line','belt-buckle','tech-emblem'],
} as const;

export function clothingPackV1Triangles(kind:ClothingPackV1Kind,id:string):readonly ClothingPackV1Triangle[]{
  if(kind==='outfit')return buildOutfit(id);
  if(kind==='hood')return buildHood(id);
  if(kind==='shirt')return buildShirt(id);
  if(kind==='strap')return buildStrap(id);
  return buildAccent(id);
}
