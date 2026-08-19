export interface VisualDifferenceMetrics {
  differenceRatio:number;
  meanColorDelta:number;
  centroidShift:number;
  bboxScaleDeviation:number;
  longestDiffSpan:number;
  thinSpike:number;
  edgeTouchRatio:number;
}

export interface VisualAnomalySample {
  id:string;
  metrics:VisualDifferenceMetrics;
}

export interface VisualAnomalyResult extends VisualAnomalySample {
  score:number;
  metricScores:Record<keyof VisualDifferenceMetrics,number>;
  critical:boolean;
  reasons:string[];
}

interface MetricRule {weight:number;floor:number;twoSided?:boolean}
const RULES:Record<keyof VisualDifferenceMetrics,MetricRule>={
  differenceRatio:{weight:.35,floor:.012},
  meanColorDelta:{weight:.45,floor:.008},
  centroidShift:{weight:.95,floor:.006},
  bboxScaleDeviation:{weight:1.05,floor:.012,twoSided:true},
  longestDiffSpan:{weight:1.10,floor:.025},
  // Thin lines are legitimate in hood drawstrings, straps and hair strands, so this is a weak
  // population signal globally. Accent parts have a separate absolute spike guard below because
  // the previously observed source-sheet artifact was a long isolated accent-colored line.
  thinSpike:{weight:.55,floor:.018},
  edgeTouchRatio:{weight:1.80,floor:.002},
};
const metricKeys=Object.keys(RULES) as (keyof VisualDifferenceMetrics)[];
const median=(values:number[])=>{if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};

export function scoreVisualAnomalyFamily(samples:readonly VisualAnomalySample[],{criticalScore=14,accentSpikeGuard=false}:{criticalScore?:number;accentSpikeGuard?:boolean}={}):VisualAnomalyResult[]{
  if(!samples.length)return[];
  const stats=Object.fromEntries(metricKeys.map(key=>{const values=samples.map(sample=>sample.metrics[key]),center=median(values),mad=median(values.map(value=>Math.abs(value-center))),scale=Math.max(RULES[key].floor,mad*1.4826);return[key,{center,scale}];})) as Record<keyof VisualDifferenceMetrics,{center:number;scale:number}>;
  return samples.map(sample=>{
    const metricScores={} as Record<keyof VisualDifferenceMetrics,number>;let sum=0;
    for(const key of metricKeys){const rule=RULES[key],stat=stats[key],delta=sample.metrics[key]-stat.center,z=(rule.twoSided?Math.abs(delta):Math.max(0,delta))/stat.scale,weighted=z*rule.weight;metricScores[key]=weighted;sum+=weighted*weighted;}
    const score=Math.sqrt(sum),reasons:string[]=[];
    if(score>criticalScore)reasons.push(`robust score ${score.toFixed(2)} > ${criticalScore}`);
    if(sample.metrics.edgeTouchRatio>.025)reasons.push(`changed pixels touch canvas edge ${(sample.metrics.edgeTouchRatio*100).toFixed(1)}%`);
    if(accentSpikeGuard&&sample.metrics.thinSpike>.38&&sample.metrics.longestDiffSpan>.34)reasons.push(`thin long color-difference component spike=${sample.metrics.thinSpike.toFixed(3)} span=${sample.metrics.longestDiffSpan.toFixed(3)}`);
    return{...sample,score,metricScores,critical:reasons.length>0,reasons};
  }).sort((a,b)=>b.score-a.score);
}
