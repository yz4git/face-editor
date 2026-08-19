export const REPAIR_PROFILES={
  'artifact-clean':{name:'artifact-clean',options:{mode:'polygon',hierarchical:'cutout',clustering:'color-cluster',filterSpeckle:10,colorPrecision:6,layerDifference:12,cornerThreshold:58,lengthThreshold:5,simplify:1.65,pathPrecision:3,maxColors:10,optimize:0}},
  'edge-detail':{name:'edge-detail',options:{mode:'polygon',hierarchical:'cutout',clustering:'color-cluster',filterSpeckle:1,colorPrecision:8,layerDifference:8,cornerThreshold:62,lengthThreshold:2,simplify:.5,pathPrecision:3,maxColors:14,optimize:0}},
  'color-detail':{name:'color-detail',options:{mode:'polygon',hierarchical:'cutout',clustering:'color-cluster',filterSpeckle:2,colorPrecision:9,layerDifference:6,cornerThreshold:60,lengthThreshold:3,simplify:.7,pathPrecision:3,maxColors:16,optimize:0}},
};

export function repairProfileIdsForResult(result){
  const ids=[];
  const metricScores=result?.metricScores??{},metrics=result?.metrics??{};
  const geometryWeight=(metricScores.longestDiffSpan??0)+(metricScores.thinSpike??0)+(metricScores.edgeTouchRatio??0);
  if(result?.critical||geometryWeight>=3.2||(metrics.edgeTouchRatio??0)>.01||(metrics.thinSpike??0)>.24){ids.push('artifact-clean');if((metricScores.longestDiffSpan??0)>=2||(metrics.edgeTouchRatio??0)>.01)ids.push('edge-detail');}
  if((metricScores.meanColorDelta??0)>=2.2)ids.push('color-detail');
  return [...new Set(ids)];
}

export function selectRepairTargets(report,{triggerScore=6}={}){
  const targets=[];
  for(const family of report?.families??[])for(const result of family?.results??[]){
    if(!result?.critical&&Number(result?.score??0)<triggerScore)continue;
    const profiles=repairProfileIdsForResult(result);
    if(profiles.length)targets.push({family:family.family,id:result.id,score:Number(result.score??0),critical:Boolean(result.critical),profiles});
  }
  return targets.sort((a,b)=>b.score-a.score);
}

export function compareRepairToBaseline(summary,baselineSummary,{scoreTolerance=1e-9}={}){
  const baseline=new Map((baselineSummary?.items??[]).map(item=>[item.id,item]));
  return(summary?.items??[]).map(item=>{
    const before=baseline.get(item.id),beforeScore=Number(before?.metrics?.score),afterScore=Number(item?.metrics?.score),hasBaseline=Number.isFinite(beforeScore),accepted=Boolean(item.passed)&&(!hasBaseline||afterScore<=beforeScore+scoreTolerance);
    return{id:item.id,accepted,beforeScore:hasBaseline?beforeScore:null,afterScore:Number.isFinite(afterScore)?afterScore:null,profile:item.profile,reason:accepted?(hasBaseline?'source quality preserved or improved':'quality gate passed; no baseline metrics supplied'):'source quality regressed or quality gate failed'};
  });
}
