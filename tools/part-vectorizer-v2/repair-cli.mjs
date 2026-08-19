#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_PROFILES, runManifest } from './lib/pipeline.mjs';
import { compareRepairToBaseline, REPAIR_PROFILES, selectManifestRepairItems, selectRepairTargets } from './lib/repair.mjs';

function parseArgs(argv){
  const out={trigger:6};
  for(let i=0;i<argv.length;i++){
    const token=argv[i];
    if(token==='--manifest')out.manifest=argv[++i];
    else if(token==='--anomaly-report')out.anomalyReport=argv[++i];
    else if(token==='--baseline-metrics')out.baselineMetrics=argv[++i];
    else if(token==='--output')out.output=argv[++i];
    else if(token==='--trigger')out.trigger=Number(argv[++i]);
    else if(token==='--workers')out.workers=Number(argv[++i]);
    else if(token==='--no-cache')out.cache=false;
    else if(token==='--help'||token==='-h')out.help=true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  return out;
}

const options=parseArgs(process.argv.slice(2));
if(options.help||!options.manifest||!options.anomalyReport){console.log(`Part Vectorizer self-healing repair loop\n\nUsage:\n  node repair-cli.mjs --manifest sheet.manifest.json --anomaly-report anomaly-report.json [--baseline-metrics metrics.json] [--output dir] [--trigger 6] [--workers N] [--no-cache]\n\nOnly anomaly candidates that need geometry repair are re-vectorized. Matching uses family:id so same-named parts in different families cannot be confused. The original detail/balanced/compact profiles are always retained, and targeted cleanup/detail profiles are added based on the anomaly class.`);process.exit(options.help?0:2);}

const manifestPath=path.resolve(options.manifest),manifestRoot=path.dirname(manifestPath),manifest=JSON.parse(await fs.readFile(manifestPath,'utf8')),report=JSON.parse(await fs.readFile(path.resolve(options.anomalyReport),'utf8')),targets=selectRepairTargets(report,{triggerScore:options.trigger});
if(!targets.length){console.log(JSON.stringify({ok:true,targets:[],message:'No geometry repair candidates cleared the trigger.'},null,2));process.exit(0);}
const selected=selectManifestRepairItems(manifest.items??[],targets),items=selected.items,missing=selected.missing;
if(!items.length)throw new Error(`Anomaly report selected ${targets.length} target(s), but none matched manifest family:id keys.`);
const profileIds=[...new Set(targets.filter(target=>items.some(item=>item.kind===target.family&&item.id===target.id)).flatMap(target=>target.profiles))],profiles=[...DEFAULT_PROFILES,...profileIds.map(id=>REPAIR_PROFILES[id]).filter(Boolean)];
const repairManifest={...manifest,items,output:undefined},tempPath=path.join(manifestRoot,`.${path.basename(manifestPath)}.self-heal-${process.pid}.json`),output=options.output??path.join(manifestRoot,'repair-output');
await fs.writeFile(tempPath,JSON.stringify(repairManifest,null,2));
let result;
try{result=await runManifest(tempPath,{failOnQuality:false,profiles,outputOverride:output,workers:options.workers??null,cache:options.cache!==false});}
finally{await fs.rm(tempPath,{force:true});}
let baselineSummary=null;
if(options.baselineMetrics)baselineSummary=JSON.parse(await fs.readFile(path.resolve(options.baselineMetrics),'utf8'));
const decisions=compareRepairToBaseline(result.summary,baselineSummary),accepted=decisions.filter(v=>v.accepted),rejected=decisions.filter(v=>!v.accepted),repairSummary={schemaVersion:1,generatedAt:new Date().toISOString(),triggerScore:options.trigger,targets,missingManifestKeys:missing,profileIds,decisions,accepted:accepted.map(v=>v.id),rejected:rejected.map(v=>v.id),output:result.outputRoot};
await fs.writeFile(path.join(result.outputRoot,'repair-summary.json'),JSON.stringify(repairSummary,null,2));
console.log(JSON.stringify({ok:rejected.length===0,targets:targets.map(v=>`${v.family}:${v.id}`),missing,profiles:profileIds,accepted:repairSummary.accepted,rejected:repairSummary.rejected,output:result.outputRoot},null,2));
if(rejected.length)process.exitCode=1;
