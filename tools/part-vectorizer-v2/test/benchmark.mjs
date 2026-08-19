import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { runManifest } from '../lib/pipeline.mjs';
import { makeFixture } from './make-fixture.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),toolRoot=path.resolve(here,'..');
await makeFixture();
const base=JSON.parse(await fs.readFile(path.join(toolRoot,'example.manifest.json'),'utf8'));
const benchmark={...base,source:'./parts.png',output:'../output-benchmark-default',items:Array.from({length:4},(_,repeat)=>base.items.map(item=>({...item,id:`${item.id}-${repeat+1}`,label:`${item.label} ${repeat+1}`}))).flat()};
const manifestPath=path.join(here,'fixture','benchmark.manifest.json');await fs.writeFile(manifestPath,JSON.stringify(benchmark,null,2));
const cacheRoot=path.join(here,'cache-benchmark');await fs.rm(cacheRoot,{recursive:true,force:true});

async function timed(name,options){
  const output=path.join(here,`output-benchmark-${name}`);await fs.rm(output,{recursive:true,force:true});const started=performance.now();const result=await runManifest(manifestPath,{failOnQuality:true,outputOverride:output,...options});return{ms:performance.now()-started,result};
}

const serial=await timed('serial',{workers:1,cache:false});
const parallel=await timed('parallel',{workers:2,cache:false});
const cold=await timed('cache-cold',{workers:2,cache:true,cacheRoot});
const warm=await timed('cache-warm',{workers:2,cache:true,cacheRoot});
if(JSON.stringify(serial.result.geometry)!==JSON.stringify(parallel.result.geometry)||JSON.stringify(serial.result.geometry)!==JSON.stringify(warm.result.geometry))throw new Error('Benchmark quality lock failed: geometry differs between execution modes');
const report={items:benchmark.items.length,profiles:serial.result.summary.profileCount,serialMs:Math.round(serial.ms),parallelMs:Math.round(parallel.ms),parallelSpeedup:Number((serial.ms/parallel.ms).toFixed(2)),coldCacheMs:Math.round(cold.ms),warmCacheMs:Math.round(warm.ms),warmCacheSpeedup:Number((cold.ms/warm.ms).toFixed(2)),warmCacheHits:warm.result.summary.optimization.cacheHits,warmCacheMisses:warm.result.summary.optimization.cacheMisses};
console.log(`VECTOR_BENCHMARK ${JSON.stringify(report)}`);
await fs.writeFile(path.join(here,'output-benchmark.json'),JSON.stringify(report,null,2));
