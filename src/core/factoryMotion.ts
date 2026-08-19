import type { ExpressionId, MotionActionId, PoseId } from './types';
import type { FactoryStyleId } from './characterFactory';

export interface FactoryMotionProfile{pose:PoseId;expression:ExpressionId;action:MotionActionId}

type Tendency={poses:readonly PoseId[];expressions:readonly ExpressionId[];actions:readonly MotionActionId[]};
export const FACTORY_MOTION_TENDENCIES:Record<FactoryStyleId,Tendency>={
  soft:{poses:['relax','cute','idle'],expressions:['smile','happy','neutral'],actions:['breathe','wave','none']},
  cool:{poses:['cool','confident','idle'],expressions:['serious','neutral','smile'],actions:['breathe','none','walk']},
  energetic:{poses:['fight','run','confident'],expressions:['happy','smile','angry'],actions:['run','wave','walk']},
  elegant:{poses:['confident','relax','cool'],expressions:['smile','serious','neutral'],actions:['breathe','walk','none']},
  street:{poses:['cool','fight','relax'],expressions:['serious','smile','angry'],actions:['walk','wave','breathe']},
  futuristic:{poses:['cool','fight','confident'],expressions:['serious','surprised','neutral'],actions:['breathe','walk','none']},
};

const hash=(value:string)=>{let h=2166136261>>>0;for(const char of value){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const pick=<T>(items:readonly T[],value:number)=>items[value%items.length]!;

export function factoryMotionProfile(style:FactoryStyleId,seed:string|number):FactoryMotionProfile{
  const tendency=FACTORY_MOTION_TENDENCIES[style],base=hash(`${seed}:${style}:motion`);
  return{
    pose:pick(tendency.poses,base),
    expression:pick(tendency.expressions,base>>>8),
    action:pick(tendency.actions,base>>>16),
  };
}
