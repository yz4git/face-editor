import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { medianColor } from './color.mjs';
import { passesQuality } from './metrics.mjs';
import { emitTypeScript } from './geometry.mjs';
import { validateManifest } from './manifest.mjs';
import { traceCandidate } from './candidate.mjs';
import { CandidateWorkerPool } from './worker-pool.mjs';

export const DEFAULT_PROFILES=[
  {name:'detail',options:{mode:'polygon',hierarchical:'cutout',clustering:'color-cluster',filterSpeckle:2,colorPrecision:8,layerDifference:8,cornerThreshold:60,lengthThreshold:3,simplify:.75,pathPrecision:3,maxColors:12,optimize:0}},
  {name:'balanced',options:{mode:'polygon',hierarchical:'cutout',clustering:'color-cluster',filterSpeckle:4,colorPrecision:6,layerDifference:12,cornerThreshold:60,lengthThreshold:4,simplify:1.25,pathPrecision:3,maxColors:10,optimize:0}},
  {name:'compact',options:{mode:'polygon',hierarchical:'cutout',clustering:'color-cluster',filterSpeckle:6,colorPrecision:5,layerDifference:16,cornerThreshold:55,lengthThreshold:5,simplify:1.8,pathPrecision:2,maxColors:8,optimize:0}},
];

const CACHE_SCHEMA=1;
const toolRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ensureInt=(v,min=0)=>Math.max(min,Math.round(v));
const insetFor=(manifest,item)=>({...manifest.contentInset,...manifest.kindInsets?.[item.kind],...item.contentInset});
const safeName=value=>String(value).replace(/[^a-z0-9_.-]+/gi,'-').replace(/^-+|-+$/g,'')||'part';

function cellRect(manifest,item,imageWidth,imageHeight){
  if(item.rect){const{x,y,width,height}=item.rect;return{left:ensureInt(x),top:ensureInt(y),width:ensureInt(width,1),height:ensureInt(height,1)};}
  const grid={...manifest.grid,...manifest.kindGrids?.[item.kind],...item.grid},columns=grid.columns??1,rows=grid.rows??1,index=item.cell??0,col=item.column??index%columns,row=item.row??Math.floor(index/columns),x=grid.x??0,y=grid.y??0,gapX=grid.gapX??0,gapY=grid.gapY??0,totalWidth=grid.width??(imageWidth-x),totalHeight=grid.height??(imageHeight-y),cellWidth=(totalWidth-gapX*(columns-1))/columns,cellHeight=(totalHeight-gapY*(rows-1))/rows,inset=insetFor(manifest,item),leftFrac=inset.left??0,rightFrac=inset.right??0,topFrac=inset.top??0,bottomFrac=inset.bottom??0;
  const left=x+col*(cellWidth+gapX)+cellWidth*leftFrac,top=y+row*(cellHeight+gapY)+cellHeight*topFrac,width=cellWidth*(1-leftFrac-rightFrac),height=cellHeight*(1-topFrac-bottomFrac);
  return{left:ensureInt(left),top:ensureInt(top),width:ensureInt(width,1),height:ensureInt(height,1)};
}

async function decodeSource(sourcePath){
  const{data,info}=await sharp(sourcePath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(!info.width||!info.height||info.channels!==4)throw new Error('Source image dimensions/RGBA channels unavailable');
  return{raw:data,width:info.width,height:info.height};
}

function extractRgba(source,rect){
  if(rect.left<0||rect.top<0||rect.left+rect.width>source.width||rect.top+rect.height>source.height)throw new Error(`Cell crop is outside source image: ${JSON.stringify(rect)}`);
  const rowBytes=rect.width*4,out=Buffer.allocUnsafe(rowBytes*rect.height);
  for(let y=0;y<rect.height;y++){
    const sourceStart=((rect.top+y)*source.width+rect.left)*4;
    source.raw.copy(out,y*rowBytes,sourceStart,sourceStart+rowBytes);
  }
  return out;
}

async function encodeRgba(raw,width,height){return sharp(raw,{raw:{width,height,channels:4}}).png().toBuffer();}
function toShared(buffer){const shared=new SharedArrayBuffer(buffer.byteLength),view=new Uint8Array(shared);view.set(buffer);return shared;}

function candidateManifest(manifest){return{
  roleHints:manifest.roleHints,
  roleBaseColors:manifest.roleBaseColors,
  kindRoleBaseColors:manifest.kindRoleBaseColors,
  sourceColorTolerance:manifest.sourceColorTolerance,
  boundaryTolerance:manifest.boundaryTolerance,
  targetBoundsByKind:manifest.targetBoundsByKind,
  target:manifest.target,
  quality:manifest.quality,
};}

function cacheKey(raw,rect,item,profiles,manifest){
  const config={schema:CACHE_SCHEMA,rect,item,profiles,manifest:candidateManifest(manifest)};
  return crypto.createHash('sha256').update(raw).update('\0').update(JSON.stringify(config)).digest('hex');
}

async function readCache(cacheRoot,key){
  try{
    const value=JSON.parse(await fs.readFile(path.join(cacheRoot,`${key}.json`),'utf8'));
    return value?.schema===CACHE_SCHEMA&&value.item&&value.bestSvg?value:null;
  }catch(error){if(error?.code==='ENOENT')return null;throw error;}
}
async function writeCache(cacheRoot,key,value){await fs.mkdir(cacheRoot,{recursive:true});await fs.writeFile(path.join(cacheRoot,`${key}.json`),JSON.stringify({schema:CACHE_SCHEMA,...value}));}

async function auditImage(id,crop,candidate,width,height){
  const labelHeight=32,panel=await sharp({create:{width:width*2,height:height+labelHeight,channels:4,background:'#f4f4f4'}}).composite([{input:crop,left:0,top:labelHeight},{input:Buffer.from(candidate.svg),left:width,top:labelHeight},{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width*2}" height="${labelHeight}"><rect width="100%" height="100%" fill="#161b22"/><text x="8" y="21" font-size="14" font-family="sans-serif" fill="white">${escapeXml(id)} · source</text><text x="${width+8}" y="21" font-size="14" font-family="sans-serif" fill="white">vector · ${escapeXml(candidate.profile)} · IoU ${candidate.metrics.maskIoU.toFixed(3)} · edge ${candidate.metrics.boundaryF1.toFixed(3)}</text></svg>`),left:0,top:0}]).png().toBuffer();return panel;
}
const escapeXml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

async function makeContactSheet(audits,outputPath){
  if(!audits.length)return;const tileWidth=560;
  const thumbs=await Promise.all(audits.map(async audit=>{const resized=await sharp(audit.buffer).resize({width:tileWidth,withoutEnlargement:true}).png().toBuffer({resolveWithObject:true});return{id:audit.id,buffer:resized.data,width:resized.info.width,height:resized.info.height};}));
  const columns=Math.min(2,thumbs.length),gap=12,cellWidth=tileWidth,rows=Math.ceil(thumbs.length/columns),rowHeights=[];for(let r=0;r<rows;r++)rowHeights[r]=Math.max(...thumbs.slice(r*columns,(r+1)*columns).map(t=>t.height),1);let totalHeight=gap;for(const h of rowHeights)totalHeight+=h+gap;const totalWidth=gap+columns*(cellWidth+gap),composites=[];let y=gap;for(let r=0;r<rows;r++){for(let c=0;c<columns;c++){const t=thumbs[r*columns+c];if(t)composites.push({input:t.buffer,left:gap+c*(cellWidth+gap),top:y});}y+=rowHeights[r]+gap;}await sharp({create:{width:totalWidth,height:totalHeight,channels:4,background:'#e8e6df'}}).composite(composites).png().toFile(outputPath);
}

async function runPool(items,concurrency,worker){const results=new Array(items.length);let cursor=0;async function run(){while(true){const index=cursor++;if(index>=items.length)return;results[index]=await worker(items[index],index);}}await Promise.all(Array.from({length:Math.min(concurrency,items.length)},run));return results;}

async function processItem(source,manifest,item,profiles,dirs,{pool,cacheEnabled,cacheRoot,stats}){
  const rect=cellRect(manifest,item,source.width,source.height),raw=extractRgba(source,rect),crop=await encodeRgba(raw,rect.width,rect.height),background=medianColor(raw,rect.width,rect.height),key=cacheKey(raw,rect,item,profiles,manifest);
  if(cacheEnabled){
    const cached=await readCache(cacheRoot,key);
    if(cached){
      stats.cacheHits++;
      const best={svg:cached.bestSvg,profile:cached.item.profile,metrics:cached.item.metrics},audit=await auditImage(item.id,crop,best,rect.width,rect.height),auditPath=path.join(dirs.audit,`${safeName(item.id)}.png`);await fs.writeFile(auditPath,audit);
      return{item:{...cached.item,cacheHit:true},audit:{id:item.id,buffer:audit}};
    }
  }
  stats.cacheMisses++;
  const sourceView={raw,width:rect.width,height:rect.height,background},context=candidateManifest(manifest),errors=[];
  const cropBuffer=pool?toShared(crop):null,sourceBuffer=pool?toShared(raw):null;
  const attempts=await Promise.all(profiles.map(async profile=>{
    try{
      const candidate=pool?await pool.run({cropBuffer,sourceBuffer,width:rect.width,height:rect.height,background,profile,item,manifest:context}):await traceCandidate(crop,sourceView,profile,item,context);
      return{candidate};
    }catch(error){return{error:String(error?.message??error),profile:profile.name};}
  }));
  const candidates=[];for(const attempt of attempts){if(attempt.candidate)candidates.push(attempt.candidate);else errors.push(`${attempt.profile}: ${attempt.error}`);}
  if(!candidates.length)throw new Error(`${item.id}: all vectorization profiles failed: ${errors.join(' | ')}`);
  candidates.sort((a,b)=>a.metrics.score-b.metrics.score);const best=candidates[0],gate={...manifest.quality,...item.quality},passed=passesQuality(best.metrics,gate),resultItem={id:item.id,kind:item.kind,label:item.label??item.id,sourceRect:rect,profile:best.profile,background:best.background,passed,metrics:best.metrics,attempts:candidates.map(c=>({profile:c.profile,metrics:c.metrics})),errors,geometry:best.geometry,cacheHit:false};
  if(cacheEnabled)await writeCache(cacheRoot,key,{item:{...resultItem,cacheHit:false},bestSvg:best.svg});
  const audit=await auditImage(item.id,crop,best,rect.width,rect.height),auditPath=path.join(dirs.audit,`${safeName(item.id)}.png`);await fs.writeFile(auditPath,audit);
  return{item:resultItem,audit:{id:item.id,buffer:audit}};
}

export async function runManifest(manifestPath,{failOnQuality=true,profiles:profileOverride=null,outputOverride=null,workers:workerOverride=null,cache=true,cacheRoot:cacheRootOverride=null}={}){
  const absoluteManifest=path.resolve(manifestPath),root=path.dirname(absoluteManifest),manifest=validateManifest(JSON.parse(await fs.readFile(absoluteManifest,'utf8'))),sourcePath=path.resolve(root,manifest.source),outputRoot=path.resolve(root,outputOverride??manifest.output??'vectorizer-output'),dirs={root:outputRoot,audit:path.join(outputRoot,'audit')};await fs.mkdir(dirs.audit,{recursive:true});
  const profiles=profileOverride??manifest.profiles??DEFAULT_PROFILES,started=performance.now(),decodeStarted=performance.now(),source=await decodeSource(sourcePath),sourceDecodeMs=performance.now()-decodeStarted;
  const available=Math.max(1,typeof os.availableParallelism==='function'?os.availableParallelism():os.cpus().length),requested=workerOverride??manifest.concurrency??Math.min(4,available),workerCount=Math.max(1,Math.min(8,available,Math.floor(requested),Math.max(1,manifest.items.length*profiles.length))),pool=workerCount>1?new CandidateWorkerPool(workerCount):null,cacheRoot=path.resolve(cacheRootOverride??path.join(toolRoot,'.cache','quality-v3')),stats={cacheHits:0,cacheMisses:0};
  let processed;
  try{processed=await runPool(manifest.items,Math.min(Math.max(workerCount,2),8),item=>processItem(source,manifest,item,profiles,dirs,{pool,cacheEnabled:cache!==false,cacheRoot,stats}));}
  finally{if(pool)await pool.close();}
  const items=processed.map(r=>r.item),failed=items.filter(v=>!v.passed),geometry=Object.fromEntries(items.map(item=>[item.id,{kind:item.kind,label:item.label,targetBounds:item.geometry.targetBounds,triangles:item.geometry.triangles}])),summary={schemaVersion:3,source:path.relative(root,sourcePath),generatedAt:new Date().toISOString(),processingMs:performance.now()-started,profileCount:profiles.length,itemCount:items.length,passed:items.length-failed.length,failed:failed.map(v=>v.id),optimization:{sourceDecodes:1,sourceDecodeMs,workerCount,availableParallelism:available,cacheEnabled:cache!==false,cacheHits:stats.cacheHits,cacheMisses:stats.cacheMisses,cacheRoot},items:items.map(({geometry:_,...item})=>item)};
  await fs.writeFile(path.join(outputRoot,'geometry.json'),JSON.stringify(geometry,null,2));await fs.writeFile(path.join(outputRoot,'geometry.generated.ts'),emitTypeScript(geometry,{exportName:manifest.exportName??'AUTO_VECTORIZED_PARTS'}));await fs.writeFile(path.join(outputRoot,'metrics.json'),JSON.stringify(summary,null,2));await makeContactSheet(processed.map(r=>r.audit),path.join(dirs.audit,'contact-sheet.png'));
  if(failOnQuality&&failed.length)throw new Error(`Quality gate failed: ${failed.map(v=>`${v.id} (IoU ${v.metrics.maskIoU.toFixed(3)}, edge ${v.metrics.boundaryF1.toFixed(3)}, MAE ${v.metrics.colorMae.toFixed(1)})`).join(', ')}`);return{summary,geometry,outputRoot};
}
