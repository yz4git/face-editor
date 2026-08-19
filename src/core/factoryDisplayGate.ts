import type { CharacterDefinition } from './types';
import type { FactoryCandidate,FactoryStyleId } from './characterFactory';

export interface FactoryDisplayDecision{accepted:boolean;reasons:string[]}
const EXTREME_MOUTHS=new Set(['o','surprised','wide-open']);
const CALM_STYLES=new Set<FactoryStyleId>(['soft','elegant']);

export function evaluateFactoryDisplaySafety(character:CharacterDefinition,style:FactoryStyleId):FactoryDisplayDecision{
  const reasons:string[]=[];
  if(character.noseStyle==='profile')reasons.push('profile nose is reserved for manual editing');
  if(EXTREME_MOUTHS.has(character.mouthStyle))reasons.push('extreme mouth expression is reserved for manual editing');
  if(character.eyeStyle==='closed'&&!CALM_STYLES.has(style))reasons.push('closed-eye expression conflicts with this style recipe');
  if(character.eyeStyle==='closed'&&character.mouthStyle==='smile-open')reasons.push('closed eyes plus open smile is too expression-specific for bulk generation');
  if(character.noseStyle==='wide'&&['pointed','diamond','tapered'].includes(character.faceShape))reasons.push('wide nose conflicts with narrow face silhouette');
  return{accepted:reasons.length===0,reasons};
}

export function selectFactoryDisplayCandidates(candidates:readonly FactoryCandidate[],count=12):FactoryCandidate[]{
  const safe=candidates.filter(candidate=>evaluateFactoryDisplaySafety(candidate.definition,candidate.style).accepted);
  return safe.slice(0,Math.max(1,Math.floor(count)));
}
