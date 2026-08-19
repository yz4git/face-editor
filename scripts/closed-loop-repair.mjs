#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { GEOMETRY_MARKERS, TRANSFORM_MARKERS, mergeAcceptedVectorRepairs, mergeAcceptedVisualRepairs, readGeneratedData, writeGeneratedData } from './lib/repair-persistence.mjs';

function parseArgs(argv){const out={maxPasses:3,port:4173};for(let i=0;i<argv.length;i++){const token=argv[i];if(token==='--max-passes')out.maxPasses=Number(argv[++i]);else if(token==='--port')out.port=Number(argv[++i]);else if(token==='--manifest')out.manifest=argv[++i];else if(token==='--baseline-metrics')out.baselineMetrics=argv[++i];else if(token==='--help'||token==='-h')out.help=true;else throw new Error(`Unknown argument: ${token}`);}return out;}
const options=parseArgs(process.argv.slice(2));
if(options.help){console.log(`Face Editor closed-loop repair\n\nUsage:\n  node scripts/closed-loop-repair.mjs [--max-passes 3] [--manifest authoring.manifest.json] [--baseline-metrics metrics.json]\n\nEach pass builds the app, audits all 92 parts, applies only quality-locked transform repairs, rebuilds, and repeats until stable. Critical geometry anomalies can additionally run selective re-vectorization when a manifest is supplied. Cumulative transforms and pass counts are hard-bounded.`);process.exit(0);}
if(!Number.isInteger(options.maxPasses)||options.maxPasses<0||options.maxPasses>6)throw new Error('--max-passes must be an integer from 0 to 6');
if(!Number.isInteger(options.port)||options.port<1024||options.port>65535)throw new Error('--port must be a valid non-privileged TCP port');

const root=process.cwd(),auditOutput=path.join(root,'visual-audit','output'),historyRoot=path.join(root,'visual-audit','closed-loop'),transformFile=path.join(root,'src','data','generated','autoRepairOverrides.ts'),geometryFile=path.join(root,'src','data','generated','autoRepairGeometry.ts'),history=[];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const hash=async()=>{const parts=await Promise.all([transformFile,geometryFile].map(file=>fs.readFile(file)));return crypto.createHash('sha256').update(parts[0]).update(parts[1]).digest('hex');};

async function run(command,args,{env={},allowFailure=false}={}){return new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd:root,env:{...process.env,...env},stdio:'inherit',shell:false});child.on('error',reject);child.on('exit',code=>{if(code===0||allowFailure)resolve(code??1);else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));});});}
async function waitForPreview(url){for(let attempt=0;attempt<60;attempt++){try{const response=await fetch(url);if(response.ok)return;}catch{}await delay(250);}throw new Error(`Preview did not become ready at ${url}`);}
async function stopPreview(child){if(child.exitCode!==null)return;child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(1500)]);if(child.exitCode===null)child.kill('SIGKILL');}

async function runAudit(pass){
  await fs.rm(auditOutput,{recursive:true,force:true});await fs.mkdir(auditOutput,{recursive:true});
  await run('npm',['run','build']);
  const preview=spawn('npm',['run','preview','--','--host','127.0.0.1','--port',String(options.port)],{cwd:root,env:process.env,stdio:'inherit',shell:false}),url=`http://127.0.0.1:${options.port}/`;let auditExit=0;
  try{await waitForPreview(url);auditExit=await run('npx',['playwright','test','visual-audit/visual-audit.spec.ts','--reporter=line'],{allowFailure:true});}finally{await stopPreview(preview);}
  const anomalyPath=path.join(auditOutput,'anomaly-report.json'),repairPath=path.join(auditOutput,'repair-report.json');
  let anomaly,repair;try{anomaly=JSON.parse(await fs.readFile(anomalyPath,'utf8'));repair=JSON.parse(await fs.readFile(repairPath,'utf8'));}catch(error){if(auditExit!==0)throw new Error(`Visual audit failed before repair reports were produced: ${error?.message??error}`);throw error;}
  if(auditExit!==0&&(anomaly.critical??[]).length===0)throw new Error('Visual audit failed for a reason other than a repairable critical anomaly.');
  const passDir=path.join(historyRoot,`pass-${pass}`);await fs.rm(passDir,{recursive:true,force:true});await fs.mkdir(historyRoot,{recursive:true});await fs.cp(auditOutput,passDir,{recursive:true});
  return{anomaly,repair,passDir,auditExit};
}

async function applyVisual(repair){const current=await readGeneratedData(transformFile,TRANSFORM_MARKERS),merged=mergeAcceptedVisualRepairs(current,repair);if(merged.blocked.length)throw new Error(`Closed-loop transform safety lock blocked: ${merged.blocked.map(item=>`${item.key}: ${item.reason}`).join(', ')}`);if(merged.changed)await writeGeneratedData(transformFile,TRANSFORM_MARKERS,merged.data);return merged;}

async function applyVector(pass,anomaly){
  if(!options.manifest)return{changed:false,applied:[],blocked:[],skipped:'no manifest'};
  const vectorDir=path.join(historyRoot,`vector-pass-${pass}`),args=['tools/part-vectorizer-v2/repair-cli.mjs','--manifest',path.resolve(options.manifest),'--anomaly-report',path.join(auditOutput,'anomaly-report.json'),'--output',vectorDir];if(options.baselineMetrics)args.push('--baseline-metrics',path.resolve(options.baselineMetrics));
  await run('node',args);
  const summaryPath=path.join(vectorDir,'repair-summary.json');try{await fs.access(summaryPath);}catch{return{changed:false,applied:[],blocked:[],skipped:'no vector targets'};}
  const repairSummary=JSON.parse(await fs.readFile(summaryPath,'utf8')),geometry=JSON.parse(await fs.readFile(path.join(vectorDir,'geometry.json'),'utf8')),current=await readGeneratedData(geometryFile,GEOMETRY_MARKERS),merged=mergeAcceptedVectorRepairs(current,geometry,repairSummary);if(merged.blocked.length)throw new Error(`Closed-loop geometry persistence blocked: ${merged.blocked.map(item=>`${item.id}: ${item.reason}`).join(', ')}`);if(merged.changed)await writeGeneratedData(geometryFile,GEOMETRY_MARKERS,merged.data);return{...merged,criticalBefore:(anomaly.critical??[]).length};
}

await fs.rm(historyRoot,{recursive:true,force:true});await fs.mkdir(historyRoot,{recursive:true});const seen=new Set([await hash()]);let mutationPasses=0,stable=false;
for(let pass=0;pass<=options.maxPasses;pass++){
  const audited=await runAudit(pass),criticalCount=(audited.anomaly.critical??[]).length,visual=await applyVisual(audited.repair),record={pass,criticalCount,auditExit:audited.auditExit,visualApplied:visual.applied,visualGeometryRequests:visual.geometryRequests,vectorApplied:[],stateChanged:false};
  if(visual.changed){record.stateChanged=true;mutationPasses++;history.push(record);if(pass===options.maxPasses)throw new Error(`Closed-loop reached max passes (${options.maxPasses}) with another accepted visual repair pending verification.`);const state=await hash();if(seen.has(state))throw new Error('Closed-loop detected a repeated generated repair state. Aborting to prevent oscillation.');seen.add(state);continue;}
  if(criticalCount>0){const vector=await applyVector(pass,audited.anomaly);record.vectorApplied=vector.applied??[];if(vector.changed){record.stateChanged=true;mutationPasses++;history.push(record);if(pass===options.maxPasses)throw new Error(`Closed-loop reached max passes (${options.maxPasses}) with repaired geometry pending verification.`);const state=await hash();if(seen.has(state))throw new Error('Closed-loop detected a repeated geometry repair state. Aborting to prevent oscillation.');seen.add(state);continue;}history.push(record);throw new Error(`Closed-loop stopped with ${criticalCount} unresolved critical visual anomaly/anomalies${options.manifest?' after vector repair':' and no --manifest was supplied for selective re-vectorization'}.`);}
  history.push(record);stable=true;break;
}
const summary={schemaVersion:1,generatedAt:new Date().toISOString(),stable,mutationPasses,maxPasses:options.maxPasses,transformOverrideFile:path.relative(root,transformFile),geometryOverrideFile:path.relative(root,geometryFile),history};await fs.writeFile(path.join(auditOutput,'closed-loop-summary.json'),JSON.stringify(summary,null,2));await fs.writeFile(path.join(historyRoot,'closed-loop-summary.json'),JSON.stringify(summary,null,2));
if(!stable)throw new Error('Closed-loop did not reach a verified stable state.');console.log(JSON.stringify({ok:true,stable,mutationPasses,passes:history.length,transformRepairs:history.flatMap(item=>item.visualApplied).map(item=>item.key),geometryRepairs:history.flatMap(item=>item.vectorApplied).map(item=>item.key)},null,2));
