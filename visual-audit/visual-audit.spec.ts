import { test, expect } from '@playwright/test';

type Family='outfit'|'hood'|'shirt'|'strap'|'accent'|'hair'|'face'|'eye'|'brow'|'nose'|'mouth';
const families:Record<Family,number>={outfit:6,hood:6,shirt:6,strap:6,accent:8,hair:10,face:10,eye:10,brow:10,nose:10,mouth:10};

async function selectIndex(page:Parameters<typeof test>[0] extends never?never:any,kind:Family,index:number){await page.locator(`[data-kind="${kind}"]`).nth(index%families[kind]).click();}

async function canvasMetrics(canvas:any){return canvas.evaluate((element:HTMLCanvasElement)=>{
  const ctx=element.getContext('2d');if(!ctx)return{painted:0,minX:0,minY:0,maxX:0,maxY:0,width:element.width,height:element.height};
  const{width,height}=element,data=ctx.getImageData(0,0,width,height).data;let painted=0,minX=width,minY=height,maxX=-1,maxY=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(data[(y*width+x)*4+3]===0)continue;painted++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  return{painted,minX,minY,maxX,maxY,width,height};
});}

test('Canvas2D full-editor audit covers and auto-fits all 92 generated parts',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d&visualAudit=1');
  await expect(page.locator('#renderer-mode')).toHaveText('CANVAS2D');const canvas=page.locator('canvas.character-canvas');await expect(canvas).toBeVisible();
  await expect(page.locator('.part-thumb')).toHaveCount(92);for(const[kind,count]of Object.entries(families))await expect(page.locator(`[data-kind="${kind}"]`)).toHaveCount(count);
  await expect(page.locator('#preview')).toHaveAttribute('data-autofit','v2');

  const seen=new Set<string>();
  for(let i=0;i<10;i++){
    for(const kind of Object.keys(families) as Family[])await selectIndex(page,kind,i);
    const metrics=await canvasMetrics(canvas);expect(metrics.painted).toBeGreaterThan(1000);expect(metrics.maxX-metrics.minX).toBeGreaterThan(metrics.width*.18);expect(metrics.maxY-metrics.minY).toBeGreaterThan(metrics.height*.35);
    expect(metrics.minX).toBeGreaterThanOrEqual(0);expect(metrics.minY).toBeGreaterThanOrEqual(0);expect(metrics.maxX).toBeLessThan(metrics.width);expect(metrics.maxY).toBeLessThan(metrics.height);
    const report=await page.evaluate(()=>((window as Window&{__FACE_EDITOR_AUTOFIT_REPORT__?:{version:number;entries:{id:string;family:string;score:number}[]}}).__FACE_EDITOR_AUTOFIT_REPORT__));
    expect(report?.version).toBe(2);expect(report?.entries).toHaveLength(13);
    for(const entry of report?.entries??[]){expect(Number.isFinite(entry.score)).toBe(true);seen.add(`${entry.family}:${entry.id.replace(/:(left|right)$/,'')}`);}
    const n=String(i+1).padStart(2,'0');await canvas.screenshot({path:`visual-audit/output/autofit-preview-${n}.png`});await page.screenshot({path:`visual-audit/output/autofit-editor-${n}.png`,fullPage:true});
  }
  expect(seen.size).toBe(92);

  await page.locator('[data-adjust="eyes"]').click();const slider=page.locator('input[data-transform-key="eyes"][data-transform-prop="spacing"]');const before=await page.locator('#preview').getAttribute('data-autofit-score');
  await slider.evaluate((el:HTMLInputElement)=>{el.value='0.08';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});await expect(page.locator('.adjust-panel')).toBeVisible();await expect(page.locator('#preview')).toHaveAttribute('data-autofit','v2');expect(await page.locator('#preview').getAttribute('data-autofit-score')).toBe(before);
});
