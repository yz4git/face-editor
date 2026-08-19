import { test,expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Motion Studio poses, animates, exports a sheet and accepts Factory characterity',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');

  const canvas=page.locator('.character-canvas');await expect(canvas).toBeVisible();
  const status=page.locator('.motion-status-pill');await expect(status).toContainText('IDLE');await expect(status).toContainText('BREATHE');
  await page.locator('.top-actions button[data-motion-open]').click();
  const studio=page.locator('.motion-studio');await expect(studio).toBeVisible();
  await expect(studio.locator('button[data-motion-pose]')).toHaveCount(8);
  await expect(studio.locator('button[data-motion-action]')).toHaveCount(6);
  await expect(studio.locator('button[data-motion-play]')).toContainText('PLAY');

  await studio.locator('button[data-motion-play]').click();
  const idleImage=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());
  await studio.locator('button[data-motion-pose="fight"]').click();
  await expect(studio.locator('button[data-motion-pose="fight"]')).toHaveClass(/selected/);
  const fightImage=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());expect(fightImage).not.toBe(idleImage);

  await page.locator('.expression-bar [data-expression="angry"]').click();
  await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);
  await studio.locator('button[data-motion-action="wave"]').click();
  await page.waitForTimeout(120);const waveA=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());
  await page.waitForTimeout(160);const waveB=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());expect(waveB).not.toBe(waveA);
  await studio.locator('button[data-motion-play]').click();
  await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);

  const exportPromise=page.waitForEvent('download');await page.locator('button[data-action="export"]').click();const exportedDownload=await exportPromise,exportedPath=await exportedDownload.path();expect(exportedPath).toBeTruthy();
  const exported=JSON.parse(await readFile(exportedPath!,'utf8'));expect(exported.motion).toEqual({version:1,pose:'fight',action:'wave',playing:false,autoBlink:true});expect(exported.expressions.active).toBe('angry');

  const sheetPromise=page.waitForEvent('download');await studio.locator('button[data-motion-sheet]').click();const sheet=await sheetPromise,sheetPath=await sheet.path();expect(sheetPath).toBeTruthy();
  const png=await readFile(sheetPath!);expect(Array.from(png.subarray(0,8))).toEqual([137,80,78,71,13,10,26,10]);

  await page.locator('.top-actions button[data-factory-open]').click();const factory=page.locator('.factory-panel');await expect(factory).toBeVisible();
  const characterity=factory.locator('.factory-selected span').last();await expect(characterity).toContainText('CHARACTERITY');const line=(await characterity.textContent())??'';
  const match=line.match(/CHARACTERITY · ([A-Z-]+) · ([A-Z-]+) · ([A-Z-]+)/);expect(match).toBeTruthy();
  await factory.locator('button[data-factory-action="use"]').click();await expect(factory).toBeHidden();
  if(match){const pose=match[2],action=match[3];await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);await expect(status).toContainText(pose);await expect(status).toContainText(action==='NONE'?'STILL':action);}

  await page.screenshot({path:'test-results/motion-studio-v1.png',fullPage:true});
});

test('Motion Studio keeps finger-sized controls on iPhone landscape',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  await page.locator('.top-actions button[data-motion-open]').click();const studio=page.locator('.motion-studio');await expect(studio).toBeVisible();
  const pose=studio.locator('button[data-motion-pose]').first(),action=studio.locator('button[data-motion-action]').first(),play=studio.locator('button[data-motion-play]');
  for(const control of [pose,action,play]){const box=await control.boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  await expect(play).toContainText('PLAY');
  await expect(page.locator('.motion-status-pill')).toBeVisible();
  await page.screenshot({path:'test-results/motion-studio-iphone-landscape.png',fullPage:true});
});
