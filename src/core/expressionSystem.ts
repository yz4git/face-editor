import type { CharacterDefinition, CharacterExpressionSet, ExpressionId, ExpressionPresetDefinition, ExpressionTransformDelta, PartTransform } from './types';

const clone=<T>(value:T):T=>structuredClone(value);
const delta=(value:ExpressionTransformDelta):ExpressionTransformDelta=>value;
const preset=(value:ExpressionPresetDefinition):ExpressionPresetDefinition=>value;

export const EXPRESSION_ORDER:readonly ExpressionId[]=['neutral','smile','happy','angry','sad','surprised','serious','blink'] as const;

export const DEFAULT_EXPRESSION_SET:CharacterExpressionSet={
  version:1,
  defaultExpression:'neutral',
  expressions:{
    neutral:preset({id:'neutral',label:'NEUTRAL',description:'Original authored face with no expression overrides.'}),
    smile:preset({
      id:'smile',label:'SMILE',description:'Friendly smile while preserving the character’s eye identity.',
      mouthStyle:'smile',
      transforms:{eyes:delta({scaleY:.98}),brows:delta({y:.008}),mouth:delta({scaleX:1.03,y:.004})},
    }),
    happy:preset({
      id:'happy',label:'HAPPY',description:'Open smile, softened eyes and lifted brows.',
      eyeStyle:'soft',browStyle:'arched',mouthStyle:'smile-open',
      transforms:{eyes:delta({scaleY:.92,y:-.004}),brows:delta({y:.018}),mouth:delta({scaleX:1.06,scaleY:1.04,y:.008})},
    }),
    angry:preset({
      id:'angry',label:'ANGRY',description:'Focused eyes, angled brows and a tightened mouth.',
      eyeStyle:'determined',browStyle:'angled',mouthStyle:'frown',
      transforms:{eyes:delta({scaleY:.94}),brows:delta({y:-.018,rotation:.075}),mouth:delta({scaleX:.96,y:-.004})},
    }),
    sad:preset({
      id:'sad',label:'SAD',description:'Lower-energy eyes, worried brows and a downturned mouth.',
      eyeStyle:'sleepy',browStyle:'worried',mouthStyle:'frown',
      transforms:{eyes:delta({y:-.008,scaleY:.96}),brows:delta({y:.012,rotation:-.055}),mouth:delta({scaleX:.98,y:-.008})},
    }),
    surprised:preset({
      id:'surprised',label:'SURPRISED',description:'Wide eyes, raised brows and an open mouth.',
      eyeStyle:'round',browStyle:'raised',mouthStyle:'surprised',
      transforms:{eyes:delta({scaleX:1.06,scaleY:1.10,y:.006}),brows:delta({y:.045}),mouth:delta({scaleX:1.08,scaleY:1.08,y:.002})},
    }),
    serious:preset({
      id:'serious',label:'SERIOUS',description:'Calm determined expression suitable for neutral gameplay portraits.',
      eyeStyle:'determined',browStyle:'straight',mouthStyle:'neutral',
      transforms:{eyes:delta({scaleY:.95}),brows:delta({y:-.006}),mouth:delta({scaleX:.98})},
    }),
    blink:preset({
      id:'blink',label:'BLINK',description:'Closed-eye frame that keeps the current mouth and brow identity.',
      eyeStyle:'closed',
      transforms:{eyes:delta({scaleY:.92,y:-.002})},
    }),
  },
};

function applyDelta(base:PartTransform,value:ExpressionTransformDelta|undefined):PartTransform{
  if(!value)return clone(base);
  return{
    x:base.x+(value.x??0),
    y:base.y+(value.y??0),
    scaleX:base.scaleX*(value.scaleX??1),
    scaleY:base.scaleY*(value.scaleY??1),
    rotation:base.rotation+(value.rotation??0),
    spacing:(base.spacing??0)+(value.spacing??0),
  };
}

export function applyExpression(base:CharacterDefinition,id:ExpressionId,set:CharacterExpressionSet=DEFAULT_EXPRESSION_SET):CharacterDefinition{
  const out=clone(base),expression=set.expressions[id]??set.expressions[set.defaultExpression];
  if(!expression||id===set.defaultExpression)return out;
  if(expression.eyeStyle)out.eyeStyle=expression.eyeStyle;
  if(expression.browStyle)out.browStyle=expression.browStyle;
  if(expression.mouthStyle)out.mouthStyle=expression.mouthStyle;
  out.transforms.eyes=applyDelta(base.transforms.eyes,expression.transforms?.eyes);
  out.transforms.brows=applyDelta(base.transforms.brows,expression.transforms?.brows);
  out.transforms.nose=applyDelta(base.transforms.nose,expression.transforms?.nose);
  out.transforms.mouth=applyDelta(base.transforms.mouth,expression.transforms?.mouth);
  return out;
}

export function cloneExpressionSet(set:CharacterExpressionSet=DEFAULT_EXPRESSION_SET):CharacterExpressionSet{return clone(set);}

export function expressionLabel(id:ExpressionId,set:CharacterExpressionSet=DEFAULT_EXPRESSION_SET){return set.expressions[id]?.label??id.toUpperCase();}
