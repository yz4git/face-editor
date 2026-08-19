import type { PartTransform } from './types';
import type { VisualAnomalyResult } from './visualAnomaly';

export type RepairFamily='outfit'|'hood'|'shirt'|'strap'|'accent'|'hair'|'face'|'eye'|'brow'|'nose'|'mouth';
export type RepairStrategy='none'|'refit'|'revectorize'|'hybrid';

export interface VisualRepairSignals {
  centroidDeltaX:number;
  centroidDeltaY:number;
  bboxWidthLogDelta:number;
  bboxHeightLogDelta:number;
}

export interface RepairCandidate {
  id:string;
  transform:PartTransform;
}

export interface VisualRepairPlan {
  family:RepairFamily;
  id:string;
  strategy:RepairStrategy;
  baselineScore:number;
  candidates:RepairCandidate[];
  revectorizeProfiles:string[];
  reasons:string[];
}

export interface RepairTrial {
  candidate:RepairCandidate;
  score:number;
  critical:boolean;
}

export interface AcceptedRepair {
  accepted:boolean;
  baselineScore:number;
  bestScore:number;
  relativeImprovement:number;
  candidate:RepairCandidate|null;
  reason:string;
}

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const transform=(x:number,y:number,scaleX:number,scaleY:number):PartTransform=>({x,y,scaleX,scaleY,rotation:0,spacing:0});

function refitCandidates(signals:VisualRepairSignals):RepairCandidate[]{
  const dx=clamp(-signals.centroidDeltaX*.58,-.026,.026),dy=clamp(-signals.centroidDeltaY*.58,-.026,.026);
  const sx=clamp(Math.exp(-signals.bboxWidthLogDelta*.34),.978,1.022),sy=clamp(Math.exp(-signals.bboxHeightLogDelta*.34),.978,1.022);
  return[
    {id:'translate-half',transform:transform(dx*.5,dy*.5,1,1)},
    {id:'translate',transform:transform(dx,dy,1,1)},
    {id:'scale-half',transform:transform(0,0,1+(sx-1)*.5,1+(sy-1)*.5)},
    {id:'combined',transform:transform(dx,dy,sx,sy)},
  ];
}

export function planVisualRepair(family:RepairFamily,result:VisualAnomalyResult,signals:VisualRepairSignals,{triggerScore=6}:{triggerScore?:number}={}):VisualRepairPlan{
  if(result.score<triggerScore&&!result.critical)return{family,id:result.id,strategy:'none',baselineScore:result.score,candidates:[],revectorizeProfiles:[],reasons:['below repair trigger']};
  const placementWeight=result.metricScores.centroidShift+result.metricScores.bboxScaleDeviation;
  const geometryWeight=result.metricScores.longestDiffSpan+result.metricScores.thinSpike+result.metricScores.edgeTouchRatio;
  const placementRisk=placementWeight>=1.5||Math.abs(signals.centroidDeltaX)>.006||Math.abs(signals.centroidDeltaY)>.006||Math.abs(signals.bboxWidthLogDelta)>.012||Math.abs(signals.bboxHeightLogDelta)>.012;
  const geometryRisk=result.critical||geometryWeight>=3.2||result.metrics.edgeTouchRatio>.01||result.metrics.thinSpike>.24;
  const colorRisk=result.metricScores.meanColorDelta>=2.2;
  const profiles:string[]=[];
  if(geometryRisk){profiles.push('artifact-clean');if(result.metricScores.longestDiffSpan>=2||result.metrics.edgeTouchRatio>.01)profiles.push('edge-detail');}
  if(colorRisk)profiles.push('color-detail');
  const candidates=placementRisk?refitCandidates(signals):[];
  const strategy:RepairStrategy=candidates.length&&profiles.length?'hybrid':candidates.length?'refit':profiles.length?'revectorize':'none';
  const reasons:string[]=[];
  if(placementRisk)reasons.push(`placement signal ${placementWeight.toFixed(2)}`);
  if(geometryRisk)reasons.push(`geometry signal ${geometryWeight.toFixed(2)}`);
  if(colorRisk)reasons.push(`color signal ${result.metricScores.meanColorDelta.toFixed(2)}`);
  return{family,id:result.id,strategy,baselineScore:result.score,candidates,revectorizeProfiles:[...new Set(profiles)],reasons};
}

export function selectQualityLockedRepair(baselineScore:number,trials:readonly RepairTrial[],{minRelativeImprovement=.08,minAbsoluteImprovement=.35}:{minRelativeImprovement?:number;minAbsoluteImprovement?:number}={}):AcceptedRepair{
  const eligible=trials.filter(trial=>!trial.critical&&Number.isFinite(trial.score)).sort((a,b)=>a.score-b.score),best=eligible[0];
  if(!best)return{accepted:false,baselineScore,bestScore:baselineScore,relativeImprovement:0,candidate:null,reason:'no non-critical repair candidate'};
  const absolute=baselineScore-best.score,relative=baselineScore>1e-9?absolute/baselineScore:0,accepted=absolute>=minAbsoluteImprovement&&relative>=minRelativeImprovement;
  return{accepted,baselineScore,bestScore:best.score,relativeImprovement:relative,candidate:accepted?best.candidate:null,reason:accepted?`score improved ${(relative*100).toFixed(1)}%`:`improvement ${(relative*100).toFixed(1)}% did not clear quality lock`};
}
