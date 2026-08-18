import { describe, expect, it } from 'vitest';
import { evaluatePairwiseAutoFitSweep, generatePairwiseAuditDefinitions } from '../src/core/autoFitSweep';

describe('pairwise auto-fit sweep',()=>{
  it('covers every selectable cross-family value pair deterministically',()=>{
    const a=generatePairwiseAuditDefinitions(),b=generatePairwiseAuditDefinitions();expect(a.length).toBeGreaterThan(1000);expect(a.length).toBeLessThanOrEqual(3828);expect(a.map(x=>JSON.stringify(x))).toEqual(b.map(x=>JSON.stringify(x)));
    const result=evaluatePairwiseAutoFitSweep();expect(result.version).toBe(1);expect(result.selectablePartCount).toBe(92);expect(result.seenPartCount).toBe(92);expect(result.pairCoverage.covered).toBe(result.pairCoverage.total);expect(result.pairCoverage.ratio).toBe(1);expect(result.worstFits.length).toBeGreaterThan(0);expect(result.worstFits.every(x=>Number.isFinite(x.score))).toBe(true);
  },30_000);
});
