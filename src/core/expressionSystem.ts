import type { BrowStyleId, CharacterDefinition, CharacterExpressionSet, ExpressionId, ExpressionPresetDefinition, ExpressionTransformDelta, EyeStyleId, MouthStyleId, PartTransform } from './types';

const clone=<T>(value:T):T=>structuredClone(value);
const delta=(value:ExpressionTransformDelta):ExpressionTransformDelta=>value;
const preset=(value:ExpressionPresetDefinition):ExpressionPresetDefinition=>value;

export const EXPRESSION_ORDER:readonly ExpressionId[]=['neutral','smile','happy','angry','sad','surprised','serious','blink'] as const;

export const DEFAULT_EXPRESSION_SET:CharacterExpressionSet={
  version:1,
  defaultExpression:'neutral',
  expressions:{
    neutral:preset({id:'neutral',label:'NEUTRAL',description:'Original authored face with no expression overrides.'}),
    smile:preset({id:'smile',label:'SMILE',description:'Friendly smile while preserving authored eye, brow and mouth identity.',mouthStyle:'smile',transforms:{eyes:delta({scaleY:.98}),brows:delta({y:.008}),mouth:delta({scaleX:1.025,y:.004})}}),
    happy:preset({id:'happy',label:'HAPPY',description:'Open smile with identity-preserving eye compression and lifted brows.',eyeStyle:'soft',browStyle:'arched',mouthStyle:'smile-open',transforms:{eyes:delta({scaleY:.90,y:-.004}),brows:delta({y:.020,rotation:-.018}),mouth:delta({scaleX:1.04,scaleY:1.025,y:.008})}}),
    angry:preset({id:'angry',label:'ANGRY',description:'Focused expression formed primarily by authored-eye compression and brow angle.',eyeStyle:'determined',browStyle:'angled',mouthStyle:'frown',transforms:{eyes:delta({scaleX:1.01,scaleY:.90,y:-.002}),brows:delta({y:-.020,rotation:.095}),mouth:delta({scaleX:.96,scaleY:.96,y:-.004})}}),
    sad:preset({id:'sad',label:'SAD',description:'Lower-energy expression preserving the selected eye and brow silhouettes.',eyeStyle:'sleepy',browStyle:'worried',mouthStyle:'frown',transforms:{eyes:delta({y:-.010,scaleY:.92}),brows:delta({y:.014,rotation:-.070}),mouth:delta({scaleX:.98,scaleY:.98,y:-.008})}}),
    surprised:preset({id:'surprised',label:'SURPRISED',description:'Wide authored eyes, raised authored brows and a controlled open mouth.',eyeStyle:'round',browStyle:'raised',mouthStyle:'surprised',transforms:{eyes:delta({scaleX:1.07,scaleY:1.13,y:.008}),brows:delta({y:.048,rotation:-.010}),mouth:delta({scaleX:1.035,scaleY:1.04,y:.002})}}),
    serious:preset({id:'serious',label:'SERIOUS',description:'Calm authored-eye compression and lowered brows without replacing identity.',eyeStyle:'determined',browStyle:'straight',mouthStyle:'neutral',transforms:{eyes:delta({scaleY:.92}),brows:delta({y:-.010,rotation:.025}),mouth:delta({scaleX:.98,scaleY:.97})}}),
    blink:preset({id:'blink',label:'BLINK',description:'Closed-eye frame that keeps the current mouth and brow identity.',eyeStyle:'closed',transforms:{eyes:delta({scaleY:.92,y:-.002})}}),
  },
};

function applyDelta(base:PartTransform,value:ExpressionTransformDelta|undefined):PartTransform{
  if(!value)return clone(base);
  return{x:base.x+(value.x??0),y:base.y+(value.y??0),scaleX:base.scaleX*(value.scaleX??1),scaleY:base.scaleY*(value.scaleY??1),rotation:base.rotation+(value.rotation??0),spacing:(base.spacing??0)+(value.spacing??0)};
}

const SMILE_FAMILY=new Set<MouthStyleId>(['smile-open','smile','soft-smile','smirk','curve']);
const OPEN_FAMILY=new Set<MouthStyleId>(['smile-open','o','surprised','wide-open']);
const REST_FAMILY=new Set<MouthStyleId>(['neutral','smirk','curve','frown']);

export function expressionMouthStyle(base:MouthStyleId,id:ExpressionId,fallback?:MouthStyleId):MouthStyleId{
  if(!fallback||id==='neutral'||id==='blink')return base;
  if(id==='smile')return SMILE_FAMILY.has(base)?base:'smile';
  if(id==='happy')return SMILE_FAMILY.has(base)?base:'smile-open';
  if(id==='surprised')return OPEN_FAMILY.has(base)?base:'o';
  if(id==='angry')return REST_FAMILY.has(base)?base:'frown';
  if(id==='sad')return base==='frown'||base==='curve'||base==='neutral'?base:'frown';
  if(id==='serious')return REST_FAMILY.has(base)?base:'neutral';
  return fallback;
}

/** Eye identity is preserved for every expression except the explicit blink frame. */
export function expressionEyeStyle(base:EyeStyleId,id:ExpressionId,fallback?:EyeStyleId):EyeStyleId{
  if(id==='blink')return fallback??'closed';
  return base;
}

/** Brows are always deformed from the authored silhouette instead of swapped to a preset. */
export function expressionBrowStyle(base:BrowStyleId,_id:ExpressionId,_fallback?:BrowStyleId):BrowStyleId{return base;}

function expressionMouthDelta(base:CharacterDefinition,id:ExpressionId,value:ExpressionTransformDelta|undefined){
  if(!value)return value;
  const out={...value};
  const petite=(base.bodyProportions?.height??1)<.90||base.faceShape==='round'||base.faceShape==='tapered';
  if(id==='surprised'){
    out.scaleX=Math.min(out.scaleX??1,petite?1.02:1.035);
    out.scaleY=Math.min(out.scaleY??1,petite?1.02:1.04);
  }else if(id==='happy'&&petite){
    out.scaleX=Math.min(out.scaleX??1,1.025);
    out.scaleY=Math.min(out.scaleY??1,1.02);
  }
  return out;
}

export function applyExpression(base:CharacterDefinition,id:ExpressionId,set:CharacterExpressionSet=DEFAULT_EXPRESSION_SET):CharacterDefinition{
  const out=clone(base),expression=set.expressions[id]??set.expressions[set.defaultExpression];
  if(!expression||id===set.defaultExpression)return out;
  if(expression.eyeStyle)out.eyeStyle=expressionEyeStyle(base.eyeStyle,id,expression.eyeStyle);
  if(expression.browStyle)out.browStyle=expressionBrowStyle(base.browStyle,id,expression.browStyle);
  if(expression.mouthStyle)out.mouthStyle=expressionMouthStyle(base.mouthStyle,id,expression.mouthStyle);
  out.transforms.eyes=applyDelta(base.transforms.eyes,expression.transforms?.eyes);
  out.transforms.brows=applyDelta(base.transforms.brows,expression.transforms?.brows);
  out.transforms.nose=applyDelta(base.transforms.nose,expression.transforms?.nose);
  out.transforms.mouth=applyDelta(base.transforms.mouth,expressionMouthDelta(base,id,expression.transforms?.mouth));
  return out;
}

export function cloneExpressionSet(set:CharacterExpressionSet=DEFAULT_EXPRESSION_SET):CharacterExpressionSet{return clone(set);}
export function expressionLabel(id:ExpressionId,set:CharacterExpressionSet=DEFAULT_EXPRESSION_SET){return set.expressions[id]?.label??id.toUpperCase();}
