import { test, expect } from '@playwright/test';

test('canvas2d fallback renders generated hair and eye variations with phase 2/3 controls',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d&visualAudit=1');
  await expect(page.locator('#renderer-mode')).toHaveText('CANVAS2D');
  const canvas=page.locator('canvas.character-canvas');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.part-thumb')).toHaveCount(38);
  await expect(page.locator('[data-kind="hair"]')).toHaveCount(10);
  await expect(page.locator('[data-kind="eye"]')).toHaveCount(10);

  const paintedPixels=await canvas.evaluate((element)=>{
    const c=element as HTMLCanvasElement,ctx=c.getContext('2d');if(!ctx)return 0;
    const data=ctx.getImageData(0,0,c.width,c.height).data;let count=0;
    for(let i=3;i<data.length;i+=4)if(data[i]>0)count++;
    return count;
  });
  expect(paintedPixels).toBeGreaterThan(1000);

  await canvas.screenshot({path:'visual-audit/output/reference-fit-character.png'});
  await page.screenshot({path:'visual-audit/output/reference-fit-editor.png',fullPage:true});
  const box=await canvas.boundingBox();
  if(!box)throw new Error('character canvas has no bounding box');
  await page.screenshot({path:'visual-audit/output/reference-fit-closeup-face.png',clip:{x:box.x+box.width*.17,y:box.y+box.height*.03,width:box.width*.66,height:box.height*.52}});
  await page.screenshot({path:'visual-audit/output/reference-fit-jacket.png',clip:{x:box.x+box.width*.10,y:box.y+box.height*.43,width:box.width*.80,height:box.height*.55}});

  await page.locator('[data-kind="hair"]').nth(4).click();
  await page.locator('[data-kind="eye"]').nth(6).click();
  await page.screenshot({path:'visual-audit/output/variation-sheet-braid-sparkle.png',fullPage:true});
  await page.locator('[data-adjust="eyes"]').click();
  const slider=page.locator('input[data-transform-key="eyes"][data-transform-prop="spacing"]');
  await slider.evaluate((el)=>{const input=el as HTMLInputElement;input.value='0.12';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
  await expect(page.locator('.adjust-panel')).toBeVisible();
  await page.screenshot({path:'visual-audit/output/phase3-adjusted-canvas2d.png',fullPage:true});
});
