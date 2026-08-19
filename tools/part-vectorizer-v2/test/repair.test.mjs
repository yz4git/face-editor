import test from 'node:test';
import assert from 'node:assert/strict';
import { compareRepairToBaseline, repairProfileIdsForResult, selectManifestRepairItems, selectRepairTargets } from '../lib/repair.mjs';

test('routes geometry anomalies to cleanup/detail profiles',()=>{
  const result={critical:true,score:18,metrics:{edgeTouchRatio:.03,thinSpike:.42},metricScores:{longestDiffSpan:4,thinSpike:3,edgeTouchRatio:5,meanColorDelta:.4}};
  const profiles=repairProfileIdsForResult(result);assert.ok(profiles.includes('artifact-clean'));assert.ok(profiles.includes('edge-detail'));
});

test('selects only anomaly results that both clear trigger and need revectorization',()=>{
  const report={families:[{family:'accent',results:[{id:'triangle',critical:true,score:17,metrics:{thinSpike:.5,edgeTouchRatio:0},metricScores:{longestDiffSpan:4,thinSpike:4,edgeTouchRatio:0,meanColorDelta:0}},{id:'diamond',critical:false,score:2,metrics:{},metricScores:{}}]}]};
  const targets=selectRepairTargets(report,{triggerScore:6});assert.equal(targets.length,1);assert.equal(targets[0].id,'triangle');
});

test('matches repair manifest items by family:id rather than id alone',()=>{
  const targets=[{family:'outfit',id:'drawstring',profiles:['artifact-clean']}],items=[{kind:'hood',id:'drawstring'},{kind:'outfit',id:'drawstring'},{kind:'outfit',id:'vest'}],selected=selectManifestRepairItems(items,targets);
  assert.deepEqual(selected.items,[{kind:'outfit',id:'drawstring'}]);assert.deepEqual(selected.missing,[]);
  const missing=selectManifestRepairItems([{kind:'hood',id:'drawstring'}],targets);assert.deepEqual(missing.items,[]);assert.deepEqual(missing.missing,['outfit:drawstring']);
});

test('quality lock rejects a source-space regression',()=>{
  const baseline={items:[{id:'a',metrics:{score:1.2}}]},summary={items:[{id:'a',passed:true,profile:'artifact-clean',metrics:{score:1.1}},{id:'b',passed:true,profile:'detail',metrics:{score:.8}}]};
  const decisions=compareRepairToBaseline(summary,baseline);assert.equal(decisions[0].accepted,true);assert.equal(decisions[1].accepted,true);
  const regressed=compareRepairToBaseline({items:[{id:'a',passed:true,profile:'artifact-clean',metrics:{score:1.3}}]},baseline);assert.equal(regressed[0].accepted,false);
});
