import { test,expect } from '@playwright/test';

const OUTFITS=['blazer','bomber','long-coat','tactical-jacket','cropped-jacket','tech-parka'] as const;
const SHIRTS=['tee','long-sleeve','tank','turtleneck','henley','dress-shirt'] as const;

async function select(page:import('@playwright/test').Page,kind:'outfit'|'shirt',id:string){const option=page.locator(`[data-kind="${kind}"][data-id="${id}"]`);await expect(option).toHaveCount(1);await option.click();await expect(option).toHaveClass(/selected/);}
async function stats(canvas:import('@playwright/test').Locator){return canvas.evaluate((node:HTMLCanvasElement)=>{const ctx=node.getContext('2d');if(!ctx)return{painted:0,edge:0};const data=ctx.getImageData(0,0,node.width,node.height).data;let painted=0,edge=0;for(let y=0;y<node.height;y++)for(let x=0;x<node.width;x++){if(data[(y*node.width+x)*4+3]>12){painted++;if(x<2||y<2||x>=node.width-2||y>=node.height-2)edge++;}}return{painted,edge};});}

test('generated jacket and inner references render as distinct high-density editor garments',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const canvas=page.locator('canvas.character-canvas');await expect(canvas).toBeVisible();
  let previous='';
  for(const id of OUTFITS){await select(page,'outfit',id);await select(page,'shirt','tee');const url=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());expect(url,id).not.toBe(previous);previous=url;const result=await stats(canvas);expect(result.painted,id).toBeGreaterThan(1000);expect(result.edge,id).toBeLessThan(40);await canvas.screenshot({path:`test-results/garment-quality/outfit-${id}.png`});}
  await select(page,'outfit','cropped-jacket');previous='';
  for(const id of SHIRTS){await select(page,'shirt',id);const url=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());expect(url,id).not.toBe(previous);previous=url;const result=await stats(canvas);expect(result.painted,id).toBeGreaterThan(1000);expect(result.edge,id).toBeLessThan(40);await canvas.screenshot({path:`test-results/garment-quality/shirt-${id}.png`});}
  await page.screenshot({path:'test-results/garment-reference-quality-v1.png',fullPage:true});
});

test('upgraded inners remain stable across both bases and extreme body profiles',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');const canvas=page.locator('canvas.character-canvas');await expect(canvas).toBeVisible();
  await select(page,'outfit','cropped-jacket');
  const profiles=[{height:.78,build:.80,shoulders:.80},{height:1,build:1,shoulders:1},{height:1.25,build:1.25,shoulders:1.35}];let audited=0;
  for(const base of ['female','male'] as const){await page.locator(`[data-base="${base}"]`).click();for(const id of SHIRTS){await select(page,'shirt',id);for(const profile of profiles){for(const[key,value]of Object.entries(profile)){await page.locator(`input[data-body-prop="${key}"]`).evaluate((node:HTMLInputElement,next)=>{node.value=String(next);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);}const result=await stats(canvas);expect(result.painted,`${base}:${id}`).toBeGreaterThan(900);expect(result.edge,`${base}:${id}`).toBeLessThan(40);audited++;}}}
  expect(audited).toBe(36);await page.screenshot({path:'test-results/garment-reference-quality-extremes.png',fullPage:true});
});
