import { test,expect } from '@playwright/test';

test('Cutscene Studio templates, scrubs and drives expression, motion, camera and dialogue',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  const canvas=page.locator('.character-canvas');await expect(canvas).toBeVisible();
  const baseline=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());

  await page.locator('.top-actions button[data-cutscene-open]').click();
  const studio=page.locator('.cutscene-studio');await expect(studio).toBeVisible();
  await expect(studio.locator('button[data-cutscene-template]')).toHaveCount(3);
  await expect(studio.locator('button[data-cutscene-cue]')).toHaveCount(4);

  await studio.locator('button[data-cutscene-template="battle"]').click();
  await expect(studio.locator('button[data-cutscene-cue]')).toHaveCount(5);
  const scrub=studio.locator('input[data-cutscene-scrub]');
  await scrub.evaluate((node:HTMLInputElement)=>{node.value='4000';node.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect(page.locator('.cutscene-dialogue')).toHaveText('This ends here.');
  await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);
  await expect(page.locator('.motion-status-pill')).toContainText('FIGHT');
  await expect(page.locator('.motion-status-pill')).toContainText('TALK');
  const dramatic=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());expect(dramatic).not.toBe(baseline);

  await studio.locator('button[data-cutscene-add]').click();await expect(studio.locator('button[data-cutscene-cue]')).toHaveCount(6);
  await studio.locator('button[data-cutscene-delete]').click();await expect(studio.locator('button[data-cutscene-cue]')).toHaveCount(5);

  await studio.locator('button[data-cutscene-restart]').click();
  await studio.locator('button[data-cutscene-play]').click();
  await page.waitForTimeout(220);
  await expect(studio.locator('button[data-cutscene-play]')).toHaveClass(/selected/);
  const timecode=await page.locator('.cutscene-timecode').textContent();expect(timecode).not.toContain('0:00.0 /');
  await studio.locator('button[data-cutscene-play]').click();

  await studio.locator('button[data-cutscene-close]').click();await expect(studio).toBeHidden();
  await expect(page.locator('.expression-bar [data-expression="neutral"]')).toHaveClass(/selected/);
  await expect(page.locator('.motion-status-pill')).toContainText('IDLE');
  await expect(page.locator('.motion-status-pill')).toContainText('BREATHE');
  const restored=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());expect(restored).toBe(baseline);
  await page.screenshot({path:'test-results/cutscene-studio-v1.png',fullPage:true});
});

test('Cutscene Studio keeps primary controls finger-sized on iPhone landscape',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  await page.locator('.top-actions button[data-cutscene-open]').click();const studio=page.locator('.cutscene-studio');await expect(studio).toBeVisible();
  const controls=[studio.locator('button[data-cutscene-template]').first(),studio.locator('button[data-cutscene-play]'),studio.locator('button[data-cutscene-add]')];
  for(const control of controls){const box=await control.boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  await expect(page.locator('.cutscene-status-pill')).toBeVisible();
  await page.screenshot({path:'test-results/cutscene-studio-iphone-landscape.png',fullPage:true});
});
