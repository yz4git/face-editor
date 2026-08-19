import { describe, expect, it } from 'vitest';
import { scoreVisualAnomalyFamily, type VisualAnomalySample } from '../src/core/visualAnomaly';

const normal=(id:string,offset=0):VisualAnomalySample=>({id,metrics:{differenceRatio:.10+offset,meanColorDelta:.035+offset*.2,centroidShift:.012+offset*.1,bboxScaleDeviation:.025+offset*.2,longestDiffSpan:.18+offset,thinSpike:.055+offset*.3,edgeTouchRatio:0}});

describe('visual anomaly scoring',()=>{
  it('ranks an isolated thin long visual artifact above normal family variation',()=>{
    const samples=[normal('a',-.008),normal('b',-.004),normal('c'),normal('d',.004),normal('e',.008),normal('f',.002),{id:'artifact',metrics:{differenceRatio:.16,meanColorDelta:.055,centroidShift:.02,bboxScaleDeviation:.035,longestDiffSpan:.62,thinSpike:.55,edgeTouchRatio:0}}];
    const scored=scoreVisualAnomalyFamily(samples,{criticalScore:8,accentSpikeGuard:true});
    expect(scored[0].id).toBe('artifact');expect(scored[0].critical).toBe(true);expect(scored[0].reasons.some(reason=>reason.includes('thin long'))).toBe(true);
    expect(scored.filter(result=>result.id!=='artifact').every(result=>!result.critical)).toBe(true);
  });

  it('flags changed pixels reaching a canvas edge independently of family median',()=>{
    const samples=[normal('a'),normal('b',.003),normal('c',-.003),{...normal('edge'),metrics:{...normal('edge').metrics,edgeTouchRatio:.05}}];
    const scored=scoreVisualAnomalyFamily(samples,{criticalScore:100});const edge=scored.find(result=>result.id==='edge');expect(edge?.critical).toBe(true);expect(edge?.reasons.some(reason=>reason.includes('canvas edge'))).toBe(true);
  });
});
