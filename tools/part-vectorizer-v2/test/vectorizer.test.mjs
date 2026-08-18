import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseVTracerSvg } from '../lib/svg.mjs';
import { runManifest } from '../lib/pipeline.mjs';
import { makeFixture } from './make-fixture.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),toolRoot=path.resolve(here,'..');

test('polygon SVG parser handles absolute and relative line commands',()=>{
  const parsed=parseVTracerSvg('<svg viewBox="0 0 20 20"><path fill="#583c28" d="M1 1L10 1l0 9H1Z"/></svg>');
  assert.equal(parsed.width,20);assert.equal(parsed.height,20);assert.equal(parsed.shapes.length,1);assert.equal(parsed.shapes[0].points.length,4);assert.equal(parsed.shapes[0].fill.hex,'#583c28');
});

test('batch pipeline chooses candidates, triangulates and emits audits',async()=>{
  await makeFixture();await fs.rm(path.join(here,'output'),{recursive:true,force:true});
  const result=await runManifest(path.join(toolRoot,'example.manifest.json'),{failOnQuality:true});
  assert.equal(result.summary.itemCount,4);assert.equal(result.summary.failed.length,0);assert.equal(Object.keys(result.geometry).length,4);
  for(const item of Object.values(result.geometry)){assert.ok(item.triangles.length>0);for(const triangle of item.triangles){assert.equal(triangle.points.length,3);assert.ok(triangle.role);}}
  for(const relative of ['geometry.json','geometry.generated.ts','metrics.json','audit/contact-sheet.png','audit/hair-a.png','audit/eye-a.png'])await fs.access(path.join(result.outputRoot,relative));
});
