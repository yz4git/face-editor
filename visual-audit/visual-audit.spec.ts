import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { scoreVisualAnomalyFamily, type VisualDifferenceMetrics } from '../src/core/visualAnomaly';
import { planVisualRepair, selectQualityLockedRepair, type RepairFamily, type VisualRepairSignals } from '../src/core/repairLoop';
import type { PartTransform } from '../src/core/types';

type AuditReference={width:number;height:number;data:Uint8ClampedArray};
type AuditWindow=Window&{__faceEditorAuditRefs?:Record<string,AuditReference>;__FACE_EDITOR_REPAIR_TRANSFORMS__?:Record<string,PartTransform>};
type CanvasScore={metrics:VisualDifferenceMetrics;signals:VisualRepairSignals};
test.setTimeout(120_000);

function storeCanvasReference(element:Element,key:string){
  const canvas=element as HTMLCanvasElement,ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas2D context unavailable');
  const view=window as AuditWindow;(view.__faceEditorAuditRefs??={})[key]={width:canvas.width,height:canvas.height,data:new Uint8ClampedArray(ctx.getImageData(0,0,canvas.width,canvas.height).data)};
}

function scoreCanvasAgainstReference(element:Element,key:string):CanvasScore{
  const canvas=element as HTMLCanvasElement,ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas2D context unavailable');
  const reference=(window as AuditWindow).__faceEditorAuditRefs?.[key];if(!reference)throw new Error(`Missing visual audit reference ${key}`);if(reference.width!==canvas.width||reference.height!==canvas.height)throw new Error('Canvas dimensions changed during visual audit');
  const current=ctx.getImageData(0,0,canvas.width,canvas.height).data,stride=2,w=Math.ceil(canvas.width/stride),h=Math.ceil(canvas.height/stride),diffMask=new Uint8Array(w*h);
  let diffCount=0,unionCount=0,totalColorDelta=0,colorSamples=0,edgeDiff=0,refX=0,refY=0,refCount=0,curX=0,curY=0,curCount=0;
  let refMinX=w,refMinY=h,refMaxX=-1,refMaxY=-1,curMinX=w,curMinY=h,curMaxX=-1,curMaxY=-1;
  for(let by=0;by<h;by++)for(let bx=0;bx<w;bx++){
    let refOn=false,curOn=false,changed=false,blockDelta=0;
    for(let oy=0;oy<stride;oy++)for(let ox=0;ox<stride;ox++){
      const x=bx*stride+ox,y=by*stride+oy;if(x>=canvas.width||y>=canvas.height)continue;const i=(y*canvas.width+x)*4,ra=reference.data[i+3],ca=current[i+3];refOn ||= ra>=24;curOn ||= ca>=24;
      if(ra>=8||ca>=8){const dr=Math.abs(reference.data[i]-current[i]),dg=Math.abs(reference.data[i+1]-current[i+1]),db=Math.abs(reference.data[i+2]-current[i+2]),da=Math.abs(ra-ca),delta=(dr+dg+db)/(255*3);blockDelta=Math.max(blockDelta,delta);totalColorDelta+=delta;colorSamples++;if(dr+dg+db>54||da>48)changed=true;}
    }
    const p=by*w+bx;if(refOn){refX+=bx;refY+=by;refCount++;refMinX=Math.min(refMinX,bx);refMinY=Math.min(refMinY,by);refMaxX=Math.max(refMaxX,bx);refMaxY=Math.max(refMaxY,by);}if(curOn){curX+=bx;curY+=by;curCount++;curMinX=Math.min(curMinX,bx);curMinY=Math.min(curMinY,by);curMaxX=Math.max(curMaxX,bx);curMaxY=Math.max(curMaxY,by);}if(refOn||curOn)unionCount++;
    if(changed&&blockDelta>.035){diffMask[p]=1;diffCount++;if(bx===0||by===0||bx===w-1||by===h-1)edgeDiff++;}
  }
  const refWidth=Math.max(1,refMaxX-refMinX+1),refHeight=Math.max(1,refMaxY-refMinY+1),curWidth=Math.max(1,curMaxX-curMinX+1),curHeight=Math.max(1,curMaxY-curMinY+1),charSpan=Math.max(refWidth,refHeight,1),refCx=refCount?refX/refCount:0,refCy=refCount?refY/refCount:0,curCx=curCount?curX/curCount:0,curCy=curCount?curY/curCount:0;
  let longestDiffSpan=0,thinSpike=0;const seen=new Uint8Array(diffMask.length),stack:number[]=[];
  for(let start=0;start<diffMask.length;start++){if(!diffMask[start]||seen[start])continue;seen[start]=1;stack.push(start);let area=0,minX=w,minY=h,maxX=-1,maxY=-1;while(stack.length){const p=stack.pop()!,x=p%w,y=Math.floor(p/w);area++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(dx===0&&dy===0)continue;const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const q=yy*w+xx;if(diffMask[q]&&!seen[q]){seen[q]=1;stack.push(q);}}}if(area<2)continue;const cw=maxX-minX+1,ch=maxY-minY+1,span=Math.max(cw,ch)/charSpan,aspect=Math.max(cw,ch)/Math.max(1,Math.min(cw,ch)),thinFactor=Math.min(1,Math.log2(Math.max(1,aspect))/6);longestDiffSpan=Math.max(longestDiffSpan,span);thinSpike=Math.max(thinSpike,span*thinFactor);}
  return{metrics:{differenceRatio:unionCount?diffCount/unionCount:0,meanColorDelta:colorSamples?totalColorDelta/colorSamples:0,centroidShift:Math.hypot(curCx-refCx,curCy-refCy)/charSpan,bboxScaleDeviation:Math.abs(Math.log(curWidth/refWidth))+Math.abs(Math.log(curHeight/refHeight)),longestDiffSpan,thinSpike,edgeTouchRatio:diffCount?edgeDiff/diffCount:0},signals:{centroidDeltaX:(curCx-refCx)/charSpan,centroidDeltaY:(refCy-curCy)/charSpan,bboxWidthLogDelta:Math.log(curWidth/refWidth),bboxHeightLogDelta:Math.log(curHeight/refHeight)}};
}

async function setRepair(page:import('@playwright/test').Page,key:string,transform:PartTransform|null){await page.evaluate(({key,transform})=>{const view=window as AuditWindow;view.__FACE_EDITOR_REPAIR_TRANSFORMS__=transform?{[key]:transform}:{};},{key,transform});}

test('canvas2d fallback visually audits, scores and self-heals all 92 generated source-sheet editor parts',async({page})=>{
  await fs.mkdir('visual-audit/output',{recursive:true});await page.setViewportSize({width:1280,height:720});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d&visualAudit=1');
  await expect(page.locator('#renderer-mode')).toHaveText('CANVAS2D');const canvas=page.locator('canvas.character-canvas');await expect(canvas).toBeVisible();await expect(page.locator('.part-thumb')).toHaveCount(92);
  const allParts={outfit:['hooded','high-collar','zip-collar','drawstring','short-sleeve','vest'],hood:['folded','drawstring','sharp','high','wide','wing'],shirt:['tee','long-sleeve','tank','three-quarter','turtleneck','sleeveless-high'],strap:['simple','padded','single-pouch','double-pouch','cross','y-harness'],accent:['diamond','long-strip','point-strip','corner','chevron','slash','taper','triangle'],hair:['ponytail','bob','side-tail','twin-tail','braid','long','wavy','short-spike','bun','half-up'],face:['soft','oval','angular','round','square','pointed','long-oval','hex','diamond','tapered'],eye:['bright','determined','sharp','round','soft','sleepy','sparkle','closed','narrow','side-glance'],brow:['soft','straight','angled','thin','bold','arched','calm','raised','flat','worried'],nose:['diamond','small','line','soft','tall','tiny','faceted','profile','wide','button'],mouth:['smile-open','smile','neutral','soft-smile','o','surprised','smirk','frown','wide-open','curve']} as const;
  const references={outfit:'hooded',hood:'folded',shirt:'tee',strap:'simple',accent:'diamond',hair:'ponytail',face:'soft',eye:'bright',brow:'soft',nose:'diamond',mouth:'smile-open'} as const;
  for(const[kind,count]of Object.entries({outfit:6,hood:6,shirt:6,strap:6,accent:8,hair:10,face:10,eye:10,brow:10,nose:10,mouth:10}))await expect(page.locator(`[data-kind="${kind}"]`)).toHaveCount(count);
  const painted=await canvas.evaluate(element=>{const c=element as HTMLCanvasElement,ctx=c.getContext('2d');if(!ctx)return 0;const d=ctx.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n;});expect(painted).toBeGreaterThan(1000);await page.screenshot({path:'visual-audit/output/generated-source-default.png',fullPage:true});

  const report:{family:string;referenceId:string;results:ReturnType<typeof scoreVisualAnomalyFamily>}[]=[],repairRecommendations:unknown[]=[],critical:string[]=[];let audited=0;
  for(const[kind,ids]of Object.entries(allParts) as [keyof typeof allParts,readonly string[]][]){
    const referenceId=references[kind];await setRepair(page,`${kind}:${referenceId}`,null);await page.locator(`[data-kind="${kind}"][data-id="${referenceId}"]`).click();await canvas.evaluate(storeCanvasReference,kind);const samples:{id:string;metrics:VisualDifferenceMetrics}[]=[],signals=new Map<string,VisualRepairSignals>();
    for(const id of ids){await setRepair(page,`${kind}:${id}`,null);const option=page.locator(`[data-kind="${kind}"][data-id="${id}"]`);await expect(option).toHaveCount(1);await option.click();await expect(option).toHaveClass(/selected/);await canvas.screenshot({path:`visual-audit/output/full-part-${kind}-${id}.png`});const score=await canvas.evaluate(scoreCanvasAgainstReference,kind);if(id!==referenceId){samples.push({id,metrics:score.metrics});signals.set(id,score.signals);}audited++;}
    const results=scoreVisualAnomalyFamily(samples,{criticalScore:14,accentSpikeGuard:kind==='accent'});report.push({family:kind,referenceId,results});for(const result of results)if(result.critical)critical.push(`${kind}:${result.id} score=${result.score.toFixed(2)} ${result.reasons.join('; ')}`);

    for(const result of results.filter(value=>value.critical||value.score>=6).slice(0,2)){
      const signal=signals.get(result.id);if(!signal)continue;const plan=planVisualRepair(kind as RepairFamily,result,signal,{triggerScore:6}),trials=[];
      for(const candidate of plan.candidates){const key=`${kind}:${result.id}`;await setRepair(page,key,candidate.transform);const option=page.locator(`[data-kind="${kind}"][data-id="${result.id}"]`);await option.click();const trialScore=await canvas.evaluate(scoreCanvasAgainstReference,kind),trialSamples=samples.map(sample=>sample.id===result.id?{id:sample.id,metrics:trialScore.metrics}:sample),trialResult=scoreVisualAnomalyFamily(trialSamples,{criticalScore:14,accentSpikeGuard:kind==='accent'}).find(value=>value.id===result.id);if(trialResult)trials.push({candidate,score:trialResult.score,critical:trialResult.critical});}
      await setRepair(page,`${kind}:${result.id}`,null);await page.locator(`[data-kind="${kind}"][data-id="${result.id}"]`).click();const selection=selectQualityLockedRepair(result.score,trials);repairRecommendations.push({family:kind,id:result.id,plan,trials:trials.map(trial=>({candidate:trial.candidate.id,score:trial.score,critical:trial.critical})),selection});
    }
  }
  expect(audited).toBe(92);await setRepair(page,'none',null);await fs.writeFile('visual-audit/output/anomaly-report.json',JSON.stringify({generatedAt:new Date().toISOString(),families:report,critical},null,2));await fs.writeFile('visual-audit/output/repair-report.json',JSON.stringify({generatedAt:new Date().toISOString(),recommendations:repairRecommendations},null,2));

  await page.locator('[data-kind="outfit"][data-id="vest"]').click();await page.locator('[data-kind="hood"][data-id="wing"]').click();await page.locator('[data-kind="shirt"][data-id="tank"]').click();await page.locator('[data-kind="strap"][data-id="y-harness"]').click();await page.locator('[data-kind="accent"][data-id="chevron"]').click();await page.locator('[data-kind="hair"][data-id="wavy"]').click();await page.locator('[data-kind="face"][data-id="diamond"]').click();await page.locator('[data-kind="eye"][data-id="closed"]').click();await page.locator('[data-kind="brow"][data-id="worried"]').click();await page.locator('[data-kind="nose"][data-id="button"]').click();await page.locator('[data-kind="mouth"][data-id="smirk"]').click();await page.screenshot({path:'visual-audit/output/generated-source-variant-a.png',fullPage:true});
  await page.locator('[data-kind="outfit"][data-id="short-sleeve"]').click();await page.locator('[data-kind="hood"][data-id="drawstring"]').click();await page.locator('[data-kind="shirt"][data-id="turtleneck"]').click();await page.locator('[data-kind="strap"][data-id="double-pouch"]').click();await page.locator('[data-kind="accent"][data-id="diamond"]').click();await page.locator('[data-kind="hair"][data-id="side-tail"]').click();await page.locator('[data-kind="face"][data-id="tapered"]').click();await page.locator('[data-kind="eye"][data-id="narrow"]').click();await page.locator('[data-kind="brow"][data-id="arched"]').click();await page.locator('[data-kind="nose"][data-id="faceted"]').click();await page.locator('[data-kind="mouth"][data-id="wide-open"]').click();await page.screenshot({path:'visual-audit/output/generated-source-variant-b.png',fullPage:true});
  await page.locator('[data-adjust="eyes"]').click();const slider=page.locator('input[data-transform-key="eyes"][data-transform-prop="spacing"]');await slider.evaluate(el=>{const input=el as HTMLInputElement;input.value='0.08';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});await expect(page.locator('.adjust-panel')).toBeVisible();
  expect(critical,`Visual anomaly gate failed:\n${critical.join('\n')}`).toEqual([]);
});
