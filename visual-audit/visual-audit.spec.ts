import { test, expect } from '@playwright/test';

test('canvas2d fallback renders and phase 2/3 controls visibly edit the character',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d&visualAudit=1');
  await expect(page.locator('#renderer-mode')).toHaveText('CANVAS2D');
  await expect(page.locator('canvas.character-canvas')).toBeVisible();
  await expect(page.locator('.part-thumb')).toHaveCount(29);

  const paintedPixels=await page.locator('canvas.character-canvas').evaluate((canvas)=>{
    const c=canvas as HTMLCanvasElement,ctx=c.getContext('2d');if(!ctx)return 0;
    const data=ctx.getImageData(0,0,c.width,c.height).data;let count=0;
    for(let i=3;i<data.length;i+=4)if(data[i]>0)count++;
    return count;
  });
  expect(paintedPixels).toBeGreaterThan(1000);
  await page.screenshot({path:'visual-audit/output/phase2-initial-canvas2d.png',fullPage:true});

  await page.locator('[data-kind="hair"]').nth(4).click();
  await page.locator('[data-adjust="eyes"]').click();
  const slider=page.locator('input[data-transform-key="eyes"][data-transform-prop="spacing"]');
  await slider.evaluate((el)=>{const input=el as HTMLInputElement;input.value='0.12';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
  await expect(page.locator('.adjust-panel')).toBeVisible();
  await page.screenshot({path:'visual-audit/output/phase3-adjusted-canvas2d.png',fullPage:true});
});
