import type { FactoryCandidate,FactoryLock,FactoryStyleId } from './characterFactory';
import type { CharacterDefinition } from './types';
import { ACCENT_COLORS, HAIR_BACK_OPTIONS, HAIR_EXTRA_OPTIONS, HARDWARE_COLORS, SECONDARY_COLORS, SHIRT_COLORS, TRIM_COLORS, normalizeAccessories, normalizeClothingLayers, normalizeHairModular, setAccessories, setHairModular } from './characterExpansion';

const clone=<T>(value:T):T=>structuredClone(value);
const hash=(value:string)=>{let h=2166136261>>>0;for(const ch of value){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const rngFor=(seed:string)=>{let a=hash(seed)||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
const pick=<T>(items:readonly T[],rng:()=>number)=>items[Math.min(items.length-1,Math.floor(rng()*items.length))];

const STYLE_MINIMAL:Record<FactoryStyleId,{shirtOnly:number;hoodOff:number;strapOff:number;accentOff:number}>={
  soft:{shirtOnly:.16,hoodOff:.34,strapOff:.58,accentOff:.30},
  cool:{shirtOnly:.10,hoodOff:.28,strapOff:.44,accentOff:.26},
  energetic:{shirtOnly:.08,hoodOff:.18,strapOff:.24,accentOff:.18},
  elegant:{shirtOnly:.13,hoodOff:.48,strapOff:.64,accentOff:.38},
  street:{shirtOnly:.08,hoodOff:.20,strapOff:.28,accentOff:.20},
  futuristic:{shirtOnly:.05,hoodOff:.12,strapOff:.16,accentOff:.12},
};
const STYLE_HAIR:Record<FactoryStyleId,{back:readonly string[];extra:readonly string[]}>={
  soft:{back:['auto','medium','wavy','long'],extra:['none','none','ponytail','bun']},
  cool:{back:['auto','short','long','medium'],extra:['none','none','ponytail','braid']},
  energetic:{back:['auto','medium','short','wavy'],extra:['none','ponytail','twin-tail','bun']},
  elegant:{back:['long','wavy','medium','auto'],extra:['none','none','braid','bun']},
  street:{back:['auto','short','medium','wavy'],extra:['none','ponytail','twin-tail','none']},
  futuristic:{back:['short','medium','auto','long'],extra:['none','twin-tail','ponytail','bun']},
};
const STYLE_ACCESSORIES:Record<FactoryStyleId,{head:readonly string[];eye:readonly string[];face:readonly string[];ear:readonly string[]}>={
  soft:{head:['none','none','beret','headband'],eye:['none','none','round-glasses','thin-frame'],face:['none','none','blush','freckles'],ear:['none','stud-earring','star-earring','none']},
  cool:{head:['none','beanie','headphones','none'],eye:['none','sunglasses','thin-frame','eyepatch'],face:['none','none','scar','under-eye-line'],ear:['none','ear-cuff','hoop-earring','double-earring']},
  energetic:{head:['none','cap','headband','goggles-up'],eye:['none','sport-goggles','square-glasses','none'],face:['none','bandage','cheek-mark','none'],ear:['none','stud-earring','double-earring','none']},
  elegant:{head:['none','none','beret','small-crown'],eye:['none','thin-frame','monocle','round-glasses'],face:['none','none','mole','blush'],ear:['none','stud-earring','star-earring','none']},
  street:{head:['none','beanie','cap','headphones'],eye:['none','sunglasses','square-glasses','none'],face:['none','cheek-mark','bandage','none'],ear:['none','chain-earring','hoop-earring','double-earring']},
  futuristic:{head:['none','sci-fi-visor','goggles-up','headphones'],eye:['none','cyber-visor','sport-goggles','eyepatch'],face:['none','under-eye-line','face-paint','none'],ear:['none','cyber-earpiece','comms-device','ear-cuff']},
};

function expansionSignature(definition:CharacterDefinition){const layers=normalizeClothingLayers(definition.clothingLayers),hair=normalizeHairModular(definition),accessories=normalizeAccessories(definition);return[JSON.stringify(layers),definition.colors.shirt??'',definition.colors.trim??'',definition.colors.secondary??'',definition.colors.hardware??'',hair.back,hair.extra,accessories.headwear,accessories.eyewear,accessories.faceDetail,accessories.earAccessory].join('|');}

export function applyGeneratedExpansion(definition:CharacterDefinition,seed:string,style:FactoryStyleId='cool',anchor?:CharacterDefinition,locks:readonly FactoryLock[]=[]){
  const out=clone(definition),rng=rngFor(`${seed}:expansion:v2`),lockSet=new Set(locks),minimal=STYLE_MINIMAL[style];
  if(lockSet.has('outfit')&&anchor){out.clothingLayers=clone(normalizeClothingLayers(anchor.clothingLayers));}
  else out.clothingLayers={outer:rng()<minimal.shirtOnly?'shirt-only':'outfit',hood:rng()>=minimal.hoodOff,strap:rng()>=minimal.strapOff,accent:rng()>=minimal.accentOff};
  if(lockSet.has('colors')&&anchor){out.colors.shirt=anchor.colors.shirt;out.colors.trim=anchor.colors.trim;out.colors.secondary=anchor.colors.secondary;out.colors.hardware=anchor.colors.hardware;}
  else{out.colors.shirt=pick(SHIRT_COLORS,rng);out.colors.trim=pick(TRIM_COLORS,rng);out.colors.secondary=pick(SECONDARY_COLORS,rng);out.colors.hardware=pick(HARDWARE_COLORS,rng);if(rng()<.45)out.colors.accent=pick(ACCENT_COLORS,rng);}
  if(lockSet.has('hair')&&anchor)setHairModular(out,normalizeHairModular(anchor));
  else{
    const hair=STYLE_HAIR[style],backs=hair.back.filter(id=>HAIR_BACK_OPTIONS.some(item=>item.id===id)) as ReturnType<typeof normalizeHairModular>['back'][],extras=hair.extra.filter(id=>HAIR_EXTRA_OPTIONS.some(item=>item.id===id)) as ReturnType<typeof normalizeHairModular>['extra'][];
    setHairModular(out,{back:pick(backs,rng)??'auto',extra:pick(extras,rng)??'none'});
  }
  if(lockSet.has('outfit')&&anchor)setAccessories(out,normalizeAccessories(anchor));
  else{
    const recipe=STYLE_ACCESSORIES[style],state=normalizeAccessories(out);
    state.headwear=pick(recipe.head,rng) as typeof state.headwear;state.eyewear=pick(recipe.eye,rng) as typeof state.eyewear;state.faceDetail=pick(recipe.face,rng) as typeof state.faceDetail;state.earAccessory=pick(recipe.ear,rng) as typeof state.earAccessory;
    let active=[state.headwear,state.eyewear,state.faceDetail,state.earAccessory].filter(id=>id!=='none').length;
    if(active>2&&state.faceDetail!=='none'){state.faceDetail='none';active--;}
    if(active>2&&state.earAccessory!=='none')state.earAccessory='none';
    setAccessories(out,state);
  }
  return out;
}

export function expandFactoryCandidate(candidate:FactoryCandidate,anchor?:CharacterDefinition,locks:readonly FactoryLock[]=[]):FactoryCandidate{
  const definition=applyGeneratedExpansion(candidate.definition,candidate.seed,candidate.style,anchor,locks);
  return{...candidate,definition,signature:`${candidate.signature}|${expansionSignature(definition)}`};
}
