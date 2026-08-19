import { FACTORY_STYLES, type FactoryStyleId } from './characterFactory';

type FamilyBias={outfit:readonly string[];hood:readonly string[];shirt:readonly string[];strap:readonly string[];accent:readonly string[]};
const BIAS:Record<FactoryStyleId,FamilyBias>={
  soft:{outfit:['blazer','cropped-jacket'],hood:['open-collar','double-collar'],shirt:['sweater','henley'],strap:['belt-pack'],accent:['badge','panel-line']},
  cool:{outfit:['long-coat','blazer'],hood:['stand-collar','high-wrap','split-lapel'],shirt:['dress-shirt','sweater'],strap:['shoulder-brace','asymmetric-strap'],accent:['badge','zip-line']},
  energetic:{outfit:['cropped-jacket','bomber','tactical-jacket'],hood:['stand-collar','open-collar'],shirt:['hoodie-inner','utility-top'],strap:['chest-rig','belt-pack'],accent:['arm-band','panel-line']},
  elegant:{outfit:['blazer','long-coat'],hood:['split-lapel','open-collar'],shirt:['dress-shirt','sweater'],strap:['shoulder-brace','asymmetric-strap'],accent:['badge','zip-line']},
  street:{outfit:['bomber','tech-parka','cropped-jacket'],hood:['open-collar','double-collar'],shirt:['hoodie-inner','henley'],strap:['belt-pack','layered-pouch'],accent:['arm-band','panel-line']},
  futuristic:{outfit:['tech-parka','tactical-jacket','long-coat'],hood:['high-wrap','stand-collar'],shirt:['utility-top','vest-inner'],strap:['tech-harness','chest-rig'],accent:['tech-emblem','zip-line']},
};

let applied=false;
const boost=(map:Readonly<Record<string,number>>,ids:readonly string[],value=4)=>{const target=map as Record<string,number>;for(const id of ids)target[id]=Math.max(target[id]??1,value);};

export function applyClothingFactoryBias(){
  if(applied)return;applied=true;
  for(const recipe of FACTORY_STYLES){const bias=BIAS[recipe.id];boost(recipe.outfit,bias.outfit);boost(recipe.hood,bias.hood);boost(recipe.shirt,bias.shirt);boost(recipe.strap,bias.strap);boost(recipe.accent,bias.accent);}
}

export function clothingFactoryBiasFor(style:FactoryStyleId){return structuredClone(BIAS[style]);}
