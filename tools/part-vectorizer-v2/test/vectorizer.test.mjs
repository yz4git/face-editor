import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseVTracerSvg } from '../lib/svg.mjs';
import { classifyShapes } from '../lib/color.mjs';
import { qualityScore } from '../lib/metrics.mjs';
import { validateManifest } from '../lib/manifest.mjs';
import { runManifest } from '../lib/pipeline.mjs';
import { makeFixture } from './make-fixture.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),toolRoot=path.resolve(here,'..'),manifestPath=path.join(toolRoot,'example.manifest.json');
const qualityMetrics=item=>({profile:item.profile,maskIoU:item.metrics.maskIoU,boundaryF1:item.metrics.boundaryF1,colorMae:item.metrics.colorMae,triangles:item.metrics.triangles,shapeCount:item.metrics.shapeCount,score:item.metrics.score});

test('polygon SVG parser handles absolute and relative line commands',()=>{
  const parsed=parseVTracerSvg('<svg viewBox="0 0 20 20"><path fill="#583c28" d="M1 1L10 1l0 9H1Z"/></svg>');
  assert.equal(parsed.width,20);assert.equal(parsed.height,20);assert.equal(parsed.shapes.length,1);assert.equal(parsed.shapes[0].points.length,4);assert.equal(parsed.shapes[0].fill.hex,'#583c28');
});

test('quality score is finite and rewards better reconstruction',()=>{
  const strong=qualityScore({maskIoU:.97,boundaryF1:.96,colorMae:5,triangles:120}),weak=qualityScore({maskIoU:.82,boundaryF1:.75,colorMae:30,triangles:120});
  assert.ok(Number.isFinite(strong));assert.ok(Number.isFinite(weak));assert.ok(strong<weak);
});

test('explicit roleColors overrides automatic semantic guessing',()=>{
  const shape=(hex,area)=>({fill:{r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16),hex},area,points:[[0,0],[1,0],[0,1]]});
  const result=classifyShapes([shape('#5a3c27',100),shape('#d34d56',20),shape('#f8f2e8',1000)],{kind:'hair',background:{r:248,g:242,b:232},roleHints:{roleColors:{hair:'#5a3c27',hairTie:'#d34d56'},roleColorTolerance:12}});
  assert.deepEqual(result.map(v=>v.role).sort(),['hair','hairTie']);
});

test('manifest validator rejects duplicate ids and invalid quality gates',()=>{
  const base={schemaVersion:2,source:'parts.png',grid:{columns:1,rows:1},items:[{id:'a',kind:'hair',cell:0}]};assert.deepEqual(validateManifest(structuredClone(base)),base);
  assert.throws(()=>validateManifest({...base,items:[...base.items,{id:'a',kind:'eye',cell:0}]}),/duplicate item id/);
  assert.throws(()=>validateManifest({...base,quality:{minMaskIoU:1.2}}),/between 0 and 1/);
});

test('batch pipeline chooses candidates, triangulates and emits audits',async()=>{
  await makeFixture();await fs.rm(path.join(here,'output'),{recursive:true,force:true});
  const result=await runManifest(manifestPath,{failOnQuality:true,cache:false});
  assert.equal(result.summary.itemCount,4);assert.equal(result.summary.failed.length,0);assert.equal(Object.keys(result.geometry).length,4);assert.equal(result.summary.optimization.sourceDecodes,1);
  for(const item of result.summary.items){assert.ok(Number.isFinite(item.metrics.score));assert.ok(item.attempts.length>=1);}
  for(const item of Object.values(result.geometry)){assert.ok(item.triangles.length>0);for(const triangle of item.triangles){assert.equal(triangle.points.length,3);assert.ok(triangle.role);}}
  for(const relative of ['geometry.json','geometry.generated.ts','metrics.json','audit/contact-sheet.png','audit/hair-a.png','audit/eye-a.png'])await fs.access(path.join(result.outputRoot,relative));
});

test('worker-thread quality mode is geometry and score identical to serial mode',async()=>{
  await makeFixture();const serialOutput=path.join(here,'output-serial'),parallelOutput=path.join(here,'output-parallel');await fs.rm(serialOutput,{recursive:true,force:true});await fs.rm(parallelOutput,{recursive:true,force:true});
  const serial=await runManifest(manifestPath,{failOnQuality:true,cache:false,workers:1,outputOverride:serialOutput});
  const parallel=await runManifest(manifestPath,{failOnQuality:true,cache:false,workers:2,outputOverride:parallelOutput});
  assert.deepEqual(parallel.geometry,serial.geometry);
  assert.deepEqual(parallel.summary.items.map(qualityMetrics),serial.summary.items.map(qualityMetrics));
  assert.equal(serial.summary.optimization.sourceDecodes,1);assert.equal(parallel.summary.optimization.sourceDecodes,1);assert.equal(serial.summary.optimization.workerCount,1);assert.ok(parallel.summary.optimization.workerCount>=1);
});

test('incremental cache skips unchanged VTracer candidates without changing geometry',async()=>{
  await makeFixture();const cacheRoot=path.join(here,'cache'),firstOutput=path.join(here,'output-cache-first'),secondOutput=path.join(here,'output-cache-second');await fs.rm(cacheRoot,{recursive:true,force:true});await fs.rm(firstOutput,{recursive:true,force:true});await fs.rm(secondOutput,{recursive:true,force:true});
  const first=await runManifest(manifestPath,{failOnQuality:true,workers:2,cache:true,cacheRoot,outputOverride:firstOutput});
  const second=await runManifest(manifestPath,{failOnQuality:true,workers:2,cache:true,cacheRoot,outputOverride:secondOutput});
  assert.deepEqual(second.geometry,first.geometry);assert.deepEqual(second.summary.items.map(qualityMetrics),first.summary.items.map(qualityMetrics));
  assert.equal(first.summary.optimization.cacheHits,0);assert.equal(first.summary.optimization.cacheMisses,4);assert.equal(second.summary.optimization.cacheHits,4);assert.equal(second.summary.optimization.cacheMisses,0);assert.ok(second.summary.items.every(item=>item.cacheHit===true));
});
