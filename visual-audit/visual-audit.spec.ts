import { test, expect } from '@playwright/test';

test('canvas2d fallback visually audits every source-sheet hair and eye variant',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('http://127.0.0.1:4173/?renderer=canvas2d&visualAudit=1');
  await expect(page.locator('#renderer-mode')).toHaveText('CANVAS2D');const canvas=page.locator('canvas.character-canvas');await expect(canvas).toBeVisible();
  await expect(page.locator('.part-thumb')).toHaveCount(38);const hair=page.locator('[data-kind="hair"]'),eyes=page.locator('[data-kind="eye"]');await expect(hair).toHaveCount(10);await expect(eyes).toHaveCount(10);
  const painted=await canvas.evaluate(element=>{const c=element as HTMLCanvasElement,ctx=c.getContext('2d');if(!ctx)return 0;const d=ctx.getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)n++;return n;});expect(painted).toBeGreaterThan(1000);
  await page.screenshot({path:'visual-audit/output/reference-fit-editor.png',fullPage:true});
  for(let i=0;i<10;i++){await hair.nth(i).click();await canvas.screenshot({path:`visual-audit/output/hair-${String(i+1).padStart(2,'0')}.png`});}
  await hair.nth(0).click();
  for(let i=0;i<10;i++){await eyes.nth(i).click();await canvas.screenshot({path:`visual-audit/output/eye-${String(i+1).padStart(2,'0')}.png`});}
  await hair.nth(4).click();await eyes.nth(6).click();await page.screenshot({path:'visual-audit/output/braid-sparkle-refined.png',fullPage:true});
  await eyes.nth(9).click();await page.screenshot({path:'visual-audit/output/side-glance-refined.png',fullPage:true});
  await page.locator('[data-adjust="eyes"]').click();const slider=page.locator('input[data-transform-key="eyes"][data-transform-prop="spacing"]');await slider.evaluate(el=>{const input=el as HTMLInputElement;input.value='0.08';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});await expect(page.locator('.adjust-panel')).toBeVisible();
});
