import { describe, expect, it } from 'vitest';
import { planVisualRepair, selectQualityLockedRepair, type RepairCandidate, type VisualRepairSignals } from '../src/core/repairLoop';
import type { VisualAnomalyResult, VisualDifferenceMetrics } from '../src/core/visualAnomaly';

const metrics:VisualDifferenceMetrics={differenceRatio:.08,meanColorDelta:.02,centroidShift:.025,bboxScaleDeviation:.035,longestDiffSpan:.16,thinSpike:.05,edgeTouchRatio:0};
const result=(overrides:Partial<VisualAnomalyResult>={}):VisualAnomalyResult=>({id:'sample',metrics,score:9,metricScores:{differenceRatio:.2,meanColorDelta:.3,centroidShift:2.4,bboxScaleDeviation:2.1,longestDiffSpan:.8,thinSpike:.2,edgeTouchRatio:0},critical:false,reasons:[],...overrides});
const signals:VisualRepairSignals={centroidDeltaX:.03,centroidDeltaY:-.02,bboxWidthLogDelta:.04,bboxHeightLogDelta:-.03};

describe('self healing repair planner',()=>{
  it('creates bounded directional refit candidates for placement anomalies',()=>{
    const plan=planVisualRepair('hair',result(),signals);
    expect(['refit','hybrid']).toContain(plan.strategy);expect(plan.candidates.length).toBeGreaterThanOrEqual(3);
    for(const candidate of plan.candidates){const t=candidate.transform;expect(Math.abs(t.x)).toBeLessThanOrEqual(.026);expect(Math.abs(t.y)).toBeLessThanOrEqual(.026);expect(t.scaleX).toBeGreaterThanOrEqual(.978);expect(t.scaleX).toBeLessThanOrEqual(1.022);expect(t.scaleY).toBeGreaterThanOrEqual(.978);expect(t.scaleY).toBeLessThanOrEqual(1.022);}
    expect(plan.candidates.find(v=>v.id==='translate')!.transform.x).toBeLessThan(0);
    expect(plan.candidates.find(v=>v.id==='translate')!.transform.y).toBeGreaterThan(0);
  });

  it('routes geometry spikes to selective revectorization profiles',()=>{
    const spiky=result({critical:true,score:18,metrics:{...metrics,thinSpike:.44,longestDiffSpan:.52,edgeTouchRatio:.03},metricScores:{differenceRatio:.2,meanColorDelta:.3,centroidShift:.2,bboxScaleDeviation:.4,longestDiffSpan:4.1,thinSpike:3.8,edgeTouchRatio:5.2},reasons:['spike']});
    const plan=planVisualRepair('accent',spiky,{centroidDeltaX:0,centroidDeltaY:0,bboxWidthLogDelta:0,bboxHeightLogDelta:0});
    expect(['revectorize','hybrid']).toContain(plan.strategy);expect(plan.revectorizeProfiles).toContain('artifact-clean');expect(plan.revectorizeProfiles).toContain('edge-detail');
  });

  it('accepts only meaningful non-critical score improvements',()=>{
    const candidate:RepairCandidate={id:'combined',transform:{x:.01,y:0,scaleX:.99,scaleY:1.01,rotation:0,spacing:0}};
    const accepted=selectQualityLockedRepair(10,[{candidate,score:8.4,critical:false}]);expect(accepted.accepted).toBe(true);expect(accepted.candidate?.id).toBe('combined');
    const weak=selectQualityLockedRepair(10,[{candidate,score:9.5,critical:false}]);expect(weak.accepted).toBe(false);
    const critical=selectQualityLockedRepair(10,[{candidate,score:7,critical:true}]);expect(critical.accepted).toBe(false);
  });
});
