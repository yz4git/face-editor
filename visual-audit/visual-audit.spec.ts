import { mkdirSync, writeFileSync } from 'node:fs';
import { test, expect, type Locator, type Page } from '@playwright/test';

type Family='outfit'|'hood'|'shirt'|'strap'|'accent'|'hair'|'face'|'eye'|'brow'|'nose'|'mouth';
type AuditIssue={code:string;family:string;id:string;severity:'warning'|'error';value:number;limit:number};
type AuditEntry={id:string;family:string;score:number};
type AuditReport={version:number;entries:AuditEntry[];issues?:AuditIssue[];totalScore?:number};
type SweepReport={version:number;caseCount:number;selectablePartCount:number;seenPartCount:number;pairCoverage:{covered:number;total:number;ratio:number};errorCount:number;worstFits:{caseIndex:number;family:string;id:string;score:number}[];errors:unknown[]};
const families:Record<Family,number>={outfit:6,hood:6,shirt:6,strap:6,accent:8,hair:10,face:10,eye:10,brow:10,nose:10,mouth:10};
const stride:Record<Family,readonly[number,number]>={outfit:[5,0],hood:[5,1],shirt:[1,2],strap:[5,3],accent:[3,1],hair:[3,0],face:[7,1],eye:[9,2],brow:[1,3],nose:[3,4],mouth:[7,5]};
const indexFor=(kind:Family,index:number)=>{const[s,o]=stride[kind];return(index*s+o)%families[kind];};
async function selectIndex(page:Page,kind:Family,index:number){await page.locator(`[data-kind="${kind}"]`).nth(indexFor(kind,index)).click();}
async function canvasMetrics(canvas:Locator){return canvas.evaluate((element:HTMLCanvasElement)=>{
  const ctx=element.getContext('2d');if(!ctx)return{painted:0,minX:0,minY:0,maxX:0,maxY:0,width:element.width,height:element.height};const{width,height}=element,data=ctx.getImageData(0,0,width,height).data;let painted=0,minX=width,minY=height,maxX=-1,maxY=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(data[(y*width+x)*4+3]===0)continue;painted++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return{painted,minX,minY,maxX,maxY,width,height};
});}

test('Canvas2D full-editor audit covers and auto-fits all 92 generated parts',async({page})=>{
  test.setTimeout(240_000);mkdirSync('visual-audit/output',{recursive:true});await page.setViewportSize({width:1280,height:720});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d&visualAudit=1');
  await expect(page.locator('#renderer-mode')).toHaveText('CANVAS2D');const preview=page.locator('#preview'),canvas=page.locator('canvas.character-canvas');await expect(canvas).toBeVisible();await expect(page.locator('.part-thumb')).toHaveCount(92);for(const[kind,count]of Object.entries(families))await expect(page.locator(`[data-kind="${kind}"]`)).toHaveCount(count);await expect(preview).toHaveAttribute('data-autofit','v2');

  // The geometry engine independently checks every value-pair across all 11 selectable families.
  await expect(preview).toHaveAttribute('data-autofit-sweep','complete',{timeout:90_000});const sweep=await page.evaluate(()=>((window as Window&{__FACE_EDITOR_AUTOFIT_SWEEP__?:SweepReport}).__FACE_EDITOR_AUTOFIT_SWEEP__));if(!sweep)throw new Error('Missing exhaustive auto-fit sweep');expect(sweep.selectablePartCount).toBe(92);expect(sweep.seenPartCount).toBe(92);expect(sweep.pairCoverage.ratio).toBe(1);expect(sweep.errorCount).toBe(0);writeFileSync('visual-audit/output/autofit-pairwise-sweep.json',JSON.stringify(sweep,null,2));

  const seen=new Set<string>(),reports:{combination:number;metrics:Awaited<ReturnType<typeof canvasMetrics>>;report:AuditReport}[]=[],allEntries:{combination:number;id:string;family:string;score:number}[]=[],issueHistogram:Record<string,number>={};
  for(let i=0;i<20;i++){
    for(const kind of Object.keys(families) as Family[])await selectIndex(page,kind,i);const metrics=await canvasMetrics(canvas);expect(metrics.painted).toBeGreaterThan(1000);expect(metrics.maxX-metrics.minX).toBeGreaterThan(metrics.width*.18);expect(metrics.maxY-metrics.minY).toBeGreaterThan(metrics.height*.35);expect(metrics.minX).toBeGreaterThanOrEqual(0);expect(metrics.minY).toBeGreaterThanOrEqual(0);expect(metrics.maxX).toBeLessThan(metrics.width);expect(metrics.maxY).toBeLessThan(metrics.height);
    const report=await page.evaluate(()=>((window as Window&{__FACE_EDITOR_AUTOFIT_REPORT__?:AuditReport}).__FACE_EDITOR_AUTOFIT_REPORT__));expect(report?.version).toBe(2);expect(report?.entries).toHaveLength(13);if(!report)throw new Error('Missing auto-fit report');
    for(const entry of report.entries){expect(Number.isFinite(entry.score)).toBe(true);seen.add(`${entry.family}:${entry.id.replace(/:(left|right)$/,'')}`);allEntries.push({combination:i+1,...entry});if(entry.family==='hair')expect(entry.score).toBeLessThan(4);else expect(entry.score).toBeLessThan(.8);}
    for(const issue of report.issues??[])issueHistogram[issue.code]=(issueHistogram[issue.code]??0)+1;
    expect((report.issues??[]).filter(issue=>issue.severity==='error'),`auto-fit relationship errors in combination ${i+1}`).toEqual([]);await expect(preview).toHaveAttribute('data-autofit-issues','0');reports.push({combination:i+1,metrics,report});const n=String(i+1).padStart(2,'0');await canvas.screenshot({path:`visual-audit/output/autofit-preview-${n}.png`});await page.screenshot({path:`visual-audit/output/autofit-editor-${n}.png`,fullPage:true});
  }
  expect(seen.size).toBe(92);const worstFits=[...allEntries].sort((a,b)=>b.score-a.score).slice(0,30);writeFileSync('visual-audit/output/autofit-report.json',JSON.stringify({version:2,seenParts:[...seen].sort(),seenCount:seen.size,issueHistogram,worstFits,combinations:reports},null,2));

  await page.locator('[data-adjust="eyes"]').click();const slider=page.locator('input[data-transform-key="eyes"][data-transform-prop="spacing"]');const before=await preview.getAttribute('data-autofit-score');await slider.evaluate((el:HTMLInputElement)=>{el.value='0.08';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});await expect(page.locator('.adjust-panel')).toBeVisible();await expect(preview).toHaveAttribute('data-autofit','v2');expect(await preview.getAttribute('data-autofit-score')).not.toBe(before);
});
