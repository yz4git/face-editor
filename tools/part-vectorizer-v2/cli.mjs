#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { DEFAULT_PROFILES, runManifest } from './lib/pipeline.mjs';

function args(argv){
  const out={};
  for(let i=0;i<argv.length;i++){
    const token=argv[i];
    if(token==='--manifest')out.manifest=argv[++i];
    else if(token==='--output')out.output=argv[++i];
    else if(token==='--workers')out.workers=Number(argv[++i]);
    else if(token==='--no-cache')out.cache=false;
    else if(token==='--no-fail')out.failOnQuality=false;
    else if(token==='--fast')out.fast=true;
    else if(token==='--help'||token==='-h')out.help=true;
    else throw new Error(`Unknown argument: ${token}`);
  }
  if(out.workers!==undefined&&(!Number.isInteger(out.workers)||out.workers<1))throw new Error('--workers must be a positive integer');
  return out;
}

const options=args(process.argv.slice(2));
if(options.help||!options.manifest){console.log(`Part Vectorizer v3 quality-locked speed path\n\nUsage:\n  node cli.mjs --manifest path/to/sheet.manifest.json [--output dir] [--workers N] [--no-cache] [--fast] [--no-fail]\n\nModes:\n  default     Trace every part with detail/balanced/compact profiles and keep the same raster-scored best result, using worker threads + incremental cache.\n  --fast      Use only the balanced profile for quick authoring previews.\n  --workers N Override automatic CPU worker count (default: manifest concurrency or available CPUs, capped at 8).\n  --no-cache  Recompute every candidate while keeping worker-thread acceleration.\n\n--output overrides the manifest output directory, which is useful for deterministic GitHub Actions artifacts.\nOutputs include game triangle data, metrics, per-part source/vector audits and a contact sheet.`);process.exit(options.help?0:2);}

const started=performance.now(),profiles=options.fast?[DEFAULT_PROFILES[1]]:null;
try{
  const result=await runManifest(options.manifest,{failOnQuality:options.failOnQuality!==false,profiles,outputOverride:options.output??null,workers:options.workers??null,cache:options.cache!==false});
  console.log(JSON.stringify({ok:true,mode:options.fast?'fast':'quality',profiles:profiles?.length??DEFAULT_PROFILES.length,items:result.summary.itemCount,passed:result.summary.passed,failed:result.summary.failed,processingMs:Math.round(result.summary.processingMs),wallMs:Math.round(performance.now()-started),workers:result.summary.optimization.workerCount,cacheHits:result.summary.optimization.cacheHits,cacheMisses:result.summary.optimization.cacheMisses,sourceDecodes:result.summary.optimization.sourceDecodes,output:result.outputRoot},null,2));
}catch(error){console.error(error?.stack??error);process.exitCode=1;}
