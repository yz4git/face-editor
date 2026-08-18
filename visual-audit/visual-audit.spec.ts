import { test, expect } from '@playwright/test';

test('canvas2d fallback visually audits generated source-sheet editor parts',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d&visualAudit=1');
  await expect(page.locator('#renderer-mode')).toHaveText('CANVAS2D');const canvas=page.locator('canvas.character-canvas');await expect(canvas).toBeVisible();
  await expect(page.locator('.part-thumb')).toHaveCount(66);
  const families={outfit:6,hair:10,face:10,eye:10,brow:10,nose:10,mouth:10} as const;
  for(const[kind,count]of Object.entries(families))await expect(page.locator(`[data-kind="${kind}"]`)).toHaveCount(count);
  const painted=await canvas.evaluate(element=>{const c=element as HTMLCanvasElement,ctx=c.getContext('2d');if(!ctx)return 0;const d=ctx.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n;});expect(painted).toBeGreaterThan(1000);
  await page.screenshot({path:'visual-audit/output/generated-source-default.png',fullPage:true});

  const hair=page.locator('[data-kind="hair"]'),eyes=page.locator('[data-kind="eye"]');
  for(let i=0;i<10;i++){await hair.nth(i).click();await canvas.screenshot({path:`visual-audit/output/generated-hair-${String(i+1).padStart(2,'0')}.png`});}
  await hair.nth(0).click();
  for(let i=0;i<10;i++){await eyes.nth(i).click();await canvas.screenshot({path:`visual-audit/output/generated-eye-${String(i+1).padStart(2,'0')}.png`});}

  await page.locator('[data-kind="outfit"][data-id="vest"]').click();
  await page.locator('[data-kind="hair"][data-id="wavy"]').click();
  await page.locator('[data-kind="face"][data-id="diamond"]').click();
  await page.locator('[data-kind="eye"][data-id="closed"]').click();
  await page.locator('[data-kind="brow"][data-id="worried"]').click();
  await page.locator('[data-kind="nose"][data-id="button"]').click();
  await page.locator('[data-kind="mouth"][data-id="smirk"]').click();
  await page.screenshot({path:'visual-audit/output/generated-source-variant-a.png',fullPage:true});

  await page.locator('[data-kind="outfit"][data-id="drawstring"]').click();
  await page.locator('[data-kind="hair"][data-id="side-tail"]').click();
  await page.locator('[data-kind="face"][data-id="tapered"]').click();
  await page.locator('[data-kind="eye"][data-id="narrow"]').click();
  await page.locator('[data-kind="brow"][data-id="arched"]').click();
  await page.locator('[data-kind="nose"][data-id="faceted"]').click();
  await page.locator('[data-kind="mouth"][data-id="wide-open"]').click();
  await page.screenshot({path:'visual-audit/output/generated-source-variant-b.png',fullPage:true});

  await page.locator('[data-adjust="eyes"]').click();const slider=page.locator('input[data-transform-key="eyes"][data-transform-prop="spacing"]');await slider.evaluate(el=>{const input=el as HTMLInputElement;input.value='0.08';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});await expect(page.locator('.adjust-panel')).toBeVisible();
});
