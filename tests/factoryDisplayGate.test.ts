import { describe,expect,it } from 'vitest';
import { evaluateFactoryDisplaySafety,selectFactoryDisplayCandidates } from '../src/core/factoryDisplayGate';
import { generateFactoryBatch } from '../src/core/characterFactory';
import { DEFAULT_CHARACTER } from '../src/data/parts';

describe('Factory display safety gate',()=>{
  it('rejects profile-only and extreme expression parts from bulk output',()=>{
    const profile=structuredClone(DEFAULT_CHARACTER);profile.noseStyle='profile';expect(evaluateFactoryDisplaySafety(profile,'cool').accepted).toBe(false);
    const extreme=structuredClone(DEFAULT_CHARACTER);extreme.mouthStyle='wide-open';expect(evaluateFactoryDisplaySafety(extreme,'energetic').accepted).toBe(false);
  });

  it('keeps neutral frontal combinations eligible',()=>{
    const character=structuredClone(DEFAULT_CHARACTER);character.noseStyle='small';character.mouthStyle='soft-smile';character.eyeStyle='bright';
    expect(evaluateFactoryDisplaySafety(character,'soft')).toEqual({accepted:true,reasons:[]});
  });

  it('can extract twelve safe candidates from an expanded deterministic pool',()=>{
    const pool=generateFactoryBatch({seed:'display-gate-regression',style:'futuristic',count:24,poolSize:160,qualityFloor:72});
    const safe=selectFactoryDisplayCandidates(pool,12);expect(safe).toHaveLength(12);
    expect(safe.every(candidate=>evaluateFactoryDisplaySafety(candidate.definition,candidate.style).accepted)).toBe(true);
  });
});
