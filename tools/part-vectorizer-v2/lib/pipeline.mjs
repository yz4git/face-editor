import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import sharp from 'sharp';
import vtracerPackage from '@visioncortex/vtracer';
import { classifyShapes, hexToRgb, medianColor, rgbHex } from './color.mjs';
import { parseVTracerSvg, shapesToSvg } from './svg.mjs';
import { alphaMask, boundaryF1, foregroundColorMae, maskIoU, passesQuality, qualityScore, semanticSourceMask } from './metrics.mjs';
import { emitTypeScript, triangulateSemanticShapes } from './geometry.mjs';

const vtracer=vtracerPackage?.default??vtracerPackage;

export const DEFAULT_PROFILES=[
  {name:'detail',options:{mode:'polygon',hierarchical:'cutout',clustering:'color-cluster',filterSpeckle:2,colorPrecision:8,layerDifference:8,cornerThreshold:60,lengthThreshold:3,simplify:.75,pathPrecision:3,maxColors:12,optimize:0}},
  {name:'balanced',options:{mode:'polygon',hierarchical:'cutout',clustering:'color-cluster',filterSpeckle:4,colorPrecision:6,layerDifference:12,cornerThreshold:60,lengthThreshold:4,simplify:1.25,pathPrecision:3,maxColors:10,optimize:0}},
  {name:'compact',options:{mode:'polygon',hierarchical:'cutout',clustering:'color-cluster',filterSpeckle:6,colorPrecision:5,layerDifference:16,cornerThreshold:55,lengthThreshold:5,simplify:1.8,pathPrecision:2,maxColors:8,optimize:0}},
];

const ensureInt=(v,min=0)=>Math.max(min,Math.round(v));
const insetFor=(manifest,item)=>({...manifest.contentInset,...manifest.kindInsets?.[item.kind],...item.contentInset});

function cellRect(manifest,item,imageWidth,imageHeight){
  if(item.rect){const{x,y,width,height}=item.rect;return{left:ensureInt(x),top:ensureInt(y),width:ensureInt(width,1),height:ensureInt(height,1)};}
  const grid=manifest.grid??{},columns=grid.columns??1,rows=grid.rows??1,index=item.cell??0,col=item.column??index%columns,row=item.row??Math.floor(index/columns),x=grid.x??0,y=grid.y??0,gapX=grid.gapX??0,gapY=grid.gapY??0,totalWidth=grid.width??(imageWidth-x),totalHeight=grid.height??(imageHeight-y),cellWidth=(totalWidth-gapX*(columns-1))/columns,cellHeight=(totalHeight-gapY*(rows-1))/rows,inset=insetFor(manifest,item),leftFrac=inset.left??0,rightFrac=inset.right??0,topFrac=inset.top??0,bottomFrac=inset.bottom??0;
  const left=x+col*(cellWidth+gapX)+cellWidth*leftFrac,top=y+row*(cellHeight+gapY)+cellHeight*topFrac,width=cellWidth*(1-leftFrac-rightFrac),height=cellHeight*(1-topFrac-bottomFrac);
  return{left:ensureInt(left),top:ensureInt(top),width:ensureInt(width,1),height:ensureInt(height,1)};
}

function roleBaseColors(manifest,item){const roles={...manifest.roleBaseColors,...manifest.kindRoleBaseColors?.[item.kind],...item.roleBaseColors};return Object.fromEntries(Object.entries(roles).map(([key,value])=>[key,typeof value==='string'?hexToRgb(value):value]));}

async function rawRgba(buffer){const{data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});return{raw:data,width:info.width,height:info.height};}

async function traceCandidate(crop,source,profile,item,manifest){
  const started=performance.now(),svg=vtracer.convertBuffer(crop,profile.options),parsed=parseVTracerSvg(svg),background=medianColor(source.raw,source.width,source.height),semantic=classifyShapes(parsed.shapes,{kind:item.kind,background,roleHints:{...manifest.roleHints?.[item.kind],...item.roleHints}});
  if(!semantic.length)throw new Error(`${profile.name}: no semantic foreground shapes`);
  const vectorSvg=shapesToSvg(source.width,source.height,semantic),rendered=await rawRgba(await sharp(Buffer.from(vectorSvg)).png().toBuffer()),sourceMask=semanticSourceMask(source.raw,source.width,source.height,semantic,{colorTolerance:item.sourceColorTolerance??manifest.sourceColorTolerance??26}),candidateMask=alphaMask(rendered.raw,rendered.width,rendered.height),iou=maskIoU(sourceMask,candidateMask),edge=boundaryF1(sourceMask,candidateMask,source.width,source.height,item.boundaryTolerance??manifest.boundaryTolerance??1),mae=foregroundColorMae(source.raw,rendered.raw,sourceMask,candidateMask),geometry=triangulateSemanticShapes(semantic,{target:item.target??manifest.targetBoundsByKind?.[item.kind]??manifest.target,roleBaseColors:roleBaseColors(manifest,item)}),metrics={maskIoU:iou,boundaryF1:edge,colorMae:mae,triangles:geometry.triangles.length,shapeCount:semantic.length,traceMs:performance.now()-started};metrics.score=qualityScore(metrics,item.quality??manifest.quality);
  return{profile:profile.name,profileOptions:profile.options,svg:vectorSvg,semantic,geometry,metrics,background:rgbHex(background)};
}

async function auditImage(id,crop,candidate,width,height){
  const labelHeight=32,panel=await sharp({create:{width:width*2,height:height+labelHeight,channels:4,background:'#f4f4f4'}}).composite([
    {input:crop,left:0,top:labelHeight},{input:Buffer.from(candidate.svg),left:width,top:labelHeight},
    {input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width*2}" height="${labelHeight}"><rect width="100%" height="100%" fill="#161b22"/><text x="8" y="21" font-size="14" font-family="sans-serif" fill="white">${escapeXml(id)} · source</text><text x="${width+8}" y="21" font-size="14" font-family="sans-serif" fill="white">vector · ${escapeXml(candidate.profile)} · IoU ${candidate.metrics.maskIoU.toFixed(3)} · edge ${candidate.metrics.boundaryF1.toFixed(3)}</text></svg>`),left:0,top:0}
  ]).png().toBuffer();return panel;
}
const escapeXml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

async function makeContactSheet(audits,outputPath){
  if(!audits.length)return;const tileWidth=560,thumbs=[];for(const audit of audits){const resized=await sharp(audit.buffer).resize({width:tileWidth,withoutEnlargement:true}).png().toBuffer({resolveWithObject:true});thumbs.push({id:audit.id,buffer:resized.data,width:resized.info.width,height:resized.info.height});}
  const columns=Math.min(2,thumbs.length),gap=12,cellWidth=tileWidth,rows=Math.ceil(thumbs.length/columns),rowHeights=[];for(let r=0;r<rows;r++)rowHeights[r]=Math.max(...thumbs.slice(r*columns,(r+1)*columns).map(t=>t.height),1);let totalHeight=gap;for(const h of rowHeights)totalHeight+=h+gap;const totalWidth=gap+columns*(cellWidth+gap),composites=[];let y=gap;for(let r=0;r<rows;r++){for(let c=0;c<columns;c++){const t=thumbs[r*columns+c];if(t)composites.push({input:t.buffer,left:gap+c*(cellWidth+gap),top:y});}y+=rowHeights[r]+gap;}await sharp({create:{width:totalWidth,height:totalHeight,channels:4,background:'#e8e6df'}}).composite(composites).png().toFile(outputPath);
}

async function processItem(sourcePath,imageMeta,manifest,item,profiles,dirs){
  const rect=cellRect(manifest,item,imageMeta.width,imageMeta.height),crop=await sharp(sourcePath).extract(rect).png().toBuffer(),source=await rawRgba(crop),candidates=[],errors=[];
  for(const profile of profiles){try{candidates.push(await traceCandidate(crop,source,profile,item,manifest));}catch(error){errors.push(String(error?.message??error));}}
  if(!candidates.length)throw new Error(`${item.id}: all vectorization profiles failed: ${errors.join(' | ')}`);candidates.sort((a,b)=>a.metrics.score-b.metrics.score);const best=candidates[0],gate={...manifest.quality,...item.quality},passed=passesQuality(best.metrics,gate),audit=await auditImage(item.id,crop,best,source.width,source.height),auditPath=path.join(dirs.audit,`${safeName(item.id)}.png`);await fs.writeFile(auditPath,audit);
  return{item:{id:item.id,kind:item.kind,label:item.label??item.id,sourceRect:rect,profile:best.profile,background:best.background,passed,metrics:best.metrics,attempts:candidates.map(c=>({profile:c.profile,metrics:c.metrics})),errors,geometry:best.geometry},audit:{id:item.id,buffer:audit}};
}

async function runPool(items,concurrency,worker){const results=new Array(items.length);let cursor=0;async function run(){while(true){const index=cursor++;if(index>=items.length)return;results[index]=await worker(items[index],index);}}await Promise.all(Array.from({length:Math.min(concurrency,items.length)},run));return results;}

const safeName=value=>String(value).replace(/[^a-z0-9_.-]+/gi,'-').replace(/^-+|-+$/g,'')||'part';
export async function runManifest(manifestPath,{failOnQuality=true,profiles:profileOverride=null}={}){
  const absoluteManifest=path.resolve(manifestPath),root=path.dirname(absoluteManifest),manifest=JSON.parse(await fs.readFile(absoluteManifest,'utf8')),sourcePath=path.resolve(root,manifest.source),outputRoot=path.resolve(root,manifest.output??'vectorizer-output'),dirs={root:outputRoot,audit:path.join(outputRoot,'audit')};await fs.mkdir(dirs.audit,{recursive:true});
  const imageMeta=await sharp(sourcePath).metadata();if(!imageMeta.width||!imageMeta.height)throw new Error('Source image dimensions unavailable');const profiles=profileOverride??manifest.profiles??DEFAULT_PROFILES,started=performance.now(),processed=await runPool(manifest.items,manifest.concurrency??4,item=>processItem(sourcePath,imageMeta,manifest,item,profiles,dirs)),items=processed.map(r=>r.item),failed=items.filter(v=>!v.passed),geometry=Object.fromEntries(items.map(item=>[item.id,{kind:item.kind,label:item.label,targetBounds:item.geometry.targetBounds,triangles:item.geometry.triangles}])),summary={schemaVersion:2,source:path.relative(root,sourcePath),generatedAt:new Date().toISOString(),processingMs:performance.now()-started,profileCount:profiles.length,itemCount:items.length,passed:items.length-failed.length,failed:failed.map(v=>v.id),items:items.map(({geometry:_,...item})=>item)};
  await fs.writeFile(path.join(outputRoot,'geometry.json'),JSON.stringify(geometry,null,2));await fs.writeFile(path.join(outputRoot,'geometry.generated.ts'),emitTypeScript(geometry,{exportName:manifest.exportName??'AUTO_VECTORIZED_PARTS'}));await fs.writeFile(path.join(outputRoot,'metrics.json'),JSON.stringify(summary,null,2));await makeContactSheet(processed.map(r=>r.audit),path.join(dirs.audit,'contact-sheet.png'));
  if(failOnQuality&&failed.length)throw new Error(`Quality gate failed: ${failed.map(v=>`${v.id} (IoU ${v.metrics.maskIoU.toFixed(3)}, edge ${v.metrics.boundaryF1.toFixed(3)}, MAE ${v.metrics.colorMae.toFixed(1)})`).join(', ')}`);return{summary,geometry,outputRoot};
}
