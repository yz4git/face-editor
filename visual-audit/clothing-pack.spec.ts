import { test,expect } from '@playwright/test';

const PACK={
  outfit:['blazer','bomber','long-coat','tactical-jacket','cropped-jacket','tech-parka'],
  hood:['open-collar','stand-collar','fur-collar','double-collar','high-wrap','split-lapel'],
  shirt:['dress-shirt','henley','sweater','hoodie-inner','vest-inner','utility-top'],
  strap:['chest-rig','shoulder-brace','belt-pack','asymmetric-strap','tech-harness','layered-pouch'],
  accent:['panel-line','arm-band','badge','zip-line','belt-buckle','tech-emblem'],
} as const;

async function canvasStats(canvas:import('@playwright/test').Locator){return canvas.evaluate((node:HTMLCanvasElement)=>{const ctx=node.getContext('2d');if(!ctx)return{painted:0,edge:0};const data=ctx.getImageData(0,0,node.width,node.height).data;let painted=0,edge=0;for(let y=0;y<node.height;y++)for(let x=0;x<node.width;x++){const a=data[(y*node.width+x)*4+3];if(a>12){painted++;if(x<2||y<2||x>=node.width-2||y>=node.height-2)edge++;}}return{painted,edge};});}

async function select(page:import('@playwright/test').Page,kind:keyof typeof PACK,id:string){const option=page.locator(`[data-kind="${kind}"][data-id="${id}"]`);await expect(option).toHaveCount(1);await option.click();await expect(option).toHaveClass(/selected/);}

test('Clothing Variation Pack v1 exposes and renders all 30 image-derived parts',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const canvas=page.locator('canvas.character-canvas');await expect(canvas).toBeVisible();await expect(page.locator('.part-thumb')).toHaveCount(122);
  await expect(page.locator('[data-kind="outfit"]')).toHaveCount(12);await expect(page.locator('[data-kind="hood"]')).toHaveCount(12);await expect(page.locator('[data-kind="shirt"]')).toHaveCount(12);await expect(page.locator('[data-kind="strap"]')).toHaveCount(12);await expect(page.locator('[data-kind="accent"]')).toHaveCount(14);
  let previous='';
  for(const id of PACK.outfit){await select(page,'outfit',id);const url=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());expect(url).not.toBe(previous);previous=url;const stats=await canvasStats(canvas);expect(stats.painted,id).toBeGreaterThan(1000);expect(stats.edge,id).toBeLessThan(40);}
  await select(page,'outfit','cropped-jacket');
  for(const kind of ['hood','shirt','strap','accent'] as const)for(const id of PACK[kind]){await select(page,kind,id);const stats=await canvasStats(canvas);expect(stats.painted,`${kind}:${id}`).toBeGreaterThan(1000);expect(stats.edge,`${kind}:${id}`).toBeLessThan(40);}
  await page.screenshot({path:'test-results/clothing-pack-v1.png',fullPage:true});
});

test('new outer outfits stay drawable across both bases and extreme body profiles',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');const canvas=page.locator('canvas.character-canvas');await expect(canvas).toBeVisible();
  const profiles=[{height:.78,build:.80,shoulders:.80},{height:1,build:1,shoulders:1},{height:1.25,build:1.25,shoulders:1.35}];let audited=0;
  for(const base of ['female','male'] as const){await page.locator(`[data-base="${base}"]`).click();for(const id of PACK.outfit){await select(page,'outfit',id);for(const profile of profiles){for(const [key,value] of Object.entries(profile)){await page.locator(`input[data-body-prop="${key}"]`).evaluate((node:HTMLInputElement,value)=>{node.value=String(value);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);}const stats=await canvasStats(canvas);expect(stats.painted,`${base}:${id}`).toBeGreaterThan(900);expect(stats.edge,`${base}:${id}`).toBeLessThan(40);audited++;}}}
  expect(audited).toBe(36);await page.screenshot({path:'test-results/clothing-pack-extremes.png',fullPage:true});
});
