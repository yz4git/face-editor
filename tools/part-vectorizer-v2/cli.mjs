#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { DEFAULT_PROFILES, runManifest } from './lib/pipeline.mjs';

function args(argv){const out={};for(let i=0;i<argv.length;i++){const token=argv[i];if(token==='--manifest')out.manifest=argv[++i];else if(token==='--output')out.output=argv[++i];else if(token==='--no-fail')out.failOnQuality=false;else if(token==='--fast')out.fast=true;else if(token==='--help'||token==='-h')out.help=true;else throw new Error(`Unknown argument: ${token}`);}return out;}

const options=args(process.argv.slice(2));
if(options.help||!options.manifest){console.log(`Part Vectorizer v2\n\nUsage:\n  node cli.mjs --manifest path/to/sheet.manifest.json [--output dir] [--fast] [--no-fail]\n\nModes:\n  default  Trace each part with detail/balanced/compact profiles and keep the best raster-scored result.\n  --fast   Use only the balanced profile for quick authoring previews.\n\n--output overrides the manifest output directory, which is useful for deterministic GitHub Actions artifacts.\nOutputs include game triangle data, metrics, per-part source/vector audits and a contact sheet.`);process.exit(options.help?0:2);}

const started=performance.now(),profiles=options.fast?[DEFAULT_PROFILES[1]]:null;
try{const result=await runManifest(options.manifest,{failOnQuality:options.failOnQuality!==false,profiles,outputOverride:options.output??null});console.log(JSON.stringify({ok:true,mode:options.fast?'fast':'quality',profiles:profiles?.length??DEFAULT_PROFILES.length,items:result.summary.itemCount,passed:result.summary.passed,failed:result.summary.failed,processingMs:Math.round(result.summary.processingMs),wallMs:Math.round(performance.now()-started),output:result.outputRoot},null,2));}
catch(error){console.error(error?.stack??error);process.exitCode=1;}
