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

const here=path.dirname(fileURLToPath(import.meta.url)),toolRoot=path.resolve(here,'..');

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
  const result=await runManifest(path.join(toolRoot,'example.manifest.json'),{failOnQuality:true});
  assert.equal(result.summary.itemCount,4);assert.equal(result.summary.failed.length,0);assert.equal(Object.keys(result.geometry).length,4);
  for(const item of result.summary.items){assert.ok(Number.isFinite(item.metrics.score));assert.ok(item.attempts.length>=1);}
  for(const item of Object.values(result.geometry)){assert.ok(item.triangles.length>0);for(const triangle of item.triangles){assert.equal(triangle.points.length,3);assert.ok(triangle.role);}}
  for(const relative of ['geometry.json','geometry.generated.ts','metrics.json','audit/contact-sheet.png','audit/hair-a.png','audit/eye-a.png'])await fs.access(path.join(result.outputRoot,relative));
});
