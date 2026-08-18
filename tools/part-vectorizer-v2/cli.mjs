#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { runManifest } from './lib/pipeline.mjs';

function args(argv){const out={};for(let i=0;i<argv.length;i++){const token=argv[i];if(token==='--manifest')out.manifest=argv[++i];else if(token==='--no-fail')out.failOnQuality=false;else if(token==='--help'||token==='-h')out.help=true;else throw new Error(`Unknown argument: ${token}`);}return out;}

const options=args(process.argv.slice(2));
if(options.help||!options.manifest){console.log(`Part Vectorizer v2\n\nUsage:\n  node cli.mjs --manifest path/to/sheet.manifest.json [--no-fail]\n\nThe command runs a small VTracer profile sweep, selects the best raster-scored candidate for every declared part, triangulates it with Earcut and writes reproducible audit/output files.`);process.exit(options.help?0:2);}

const started=performance.now();
try{const result=await runManifest(options.manifest,{failOnQuality:options.failOnQuality!==false});console.log(JSON.stringify({ok:true,items:result.summary.itemCount,passed:result.summary.passed,failed:result.summary.failed,processingMs:Math.round(result.summary.processingMs),wallMs:Math.round(performance.now()-started),output:result.outputRoot},null,2));}
catch(error){console.error(error?.stack??error);process.exitCode=1;}
