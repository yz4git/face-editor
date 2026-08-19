import { describe,expect,it } from 'vitest';
import { GEOMETRY_MARKERS, TRANSFORM_MARKERS, mergeAcceptedVectorRepairs, mergeAcceptedVisualRepairs, readMarkedJson, writeMarkedJson } from '../scripts/lib/repair-persistence.mjs';

const candidate=(transform={x:.01,y:-.01,scaleX:1.01,scaleY:.99,rotation:0,spacing:0})=>({family:'hair',id:'half-up',plan:{baselineScore:8,revectorizeProfiles:[]},selection:{accepted:true,baselineScore:8,bestScore:6,candidate:{id:'combined',transform}}});

describe('closed-loop repair persistence',()=>{
  it('round-trips generated marker data without touching surrounding TypeScript',()=>{
    const source='before\n/* AUTO_REPAIR_DATA_START */\n{}\n/* AUTO_REPAIR_DATA_END */;\nafter\n',next=writeMarkedJson(source,TRANSFORM_MARKERS,{a:{passes:1}});
    expect(next.startsWith('before\n')).toBe(true);expect(next.endsWith(';\nafter\n')).toBe(true);expect(readMarkedJson(next,TRANSFORM_MARKERS)).toEqual({a:{passes:1}});
  });

  it('persists only accepted bounded visual repairs and composes repeated passes',()=>{
    const first=mergeAcceptedVisualRepairs({}, {recommendations:[candidate()]});
    expect(first.blocked).toEqual([]);expect(first.applied).toHaveLength(1);expect(first.data['hair:half-up'].passes).toBe(1);
    const second=mergeAcceptedVisualRepairs(first.data,{recommendations:[candidate({x:.01,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0})]});
    expect(second.data['hair:half-up'].passes).toBe(2);expect(second.data['hair:half-up'].transform.x).toBeCloseTo(.0201,6);
  });

  it('blocks transform runaway and per-part infinite repair loops',()=>{
    const runaway=mergeAcceptedVisualRepairs({}, {recommendations:[candidate({x:.08,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0})]});
    expect(runaway.applied).toEqual([]);expect(runaway.blocked[0].reason).toMatch(/translation/);
    const current={'hair:half-up':{transform:{x:0,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0},passes:3,baselineScore:8,finalScore:5}};
    const capped=mergeAcceptedVisualRepairs(current,{recommendations:[candidate()]});expect(capped.applied).toEqual([]);expect(capped.blocked[0].reason).toMatch(/pass limit/);
  });

  it('persists only accepted finite semantic triangle replacements',()=>{
    const geometry={vest:{kind:'outfit',triangles:[{role:'jacket',shade:0,points:[[0,0],[1,0],[0,1]]}]}};
    const summary={accepted:['vest'],decisions:[{id:'vest',profile:'artifact-clean',beforeScore:.2,afterScore:.15}]},merged=mergeAcceptedVectorRepairs({},geometry,summary);
    expect(merged.blocked).toEqual([]);expect(merged.data['outfit:vest'].profile).toBe('artifact-clean');expect(merged.data['outfit:vest'].triangles).toHaveLength(1);
    const invalid=mergeAcceptedVectorRepairs({}, {vest:{kind:'outfit',triangles:[{role:'jacket',shade:0,points:[[0,0],[Number.NaN,0],[0,1]]}]}},summary);expect(invalid.applied).toEqual([]);expect(invalid.blocked[0].reason).toMatch(/invalid/);
  });

  it('supports the independent geometry marker envelope',()=>{
    const source='x\n/* AUTO_REPAIR_GEOMETRY_START */\n{}\n/* AUTO_REPAIR_GEOMETRY_END */;\ny',next=writeMarkedJson(source,GEOMETRY_MARKERS,{'hair:a':{kind:'hair'}});expect(readMarkedJson(next,GEOMETRY_MARKERS)).toEqual({'hair:a':{kind:'hair'}});
  });
});
