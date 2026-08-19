import { test,expect } from '@playwright/test';
import { readFile,stat } from 'node:fs/promises';

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

test('Cutscene Studio edits cue timing, acting, camera, project metadata and exports outputs',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  await page.locator('.top-actions button[data-cutscene-open]').click();const studio=page.locator('.cutscene-studio');await expect(studio).toBeVisible();
  await studio.locator('button[data-cutscene-template="reaction"]').click();
  await studio.locator('[data-cutscene-title]').evaluate((node:HTMLInputElement)=>{node.value='CUSTOM REACTION';node.dispatchEvent(new Event('change',{bubbles:true}));});
  await studio.locator('[data-cutscene-duration]').evaluate((node:HTMLInputElement)=>{node.value='7.5';node.dispatchEvent(new Event('change',{bubbles:true}));});
  await studio.locator('button[data-cutscene-cue]').nth(1).click();
  await studio.locator('[data-cutscene-label]').evaluate((node:HTMLInputElement)=>{node.value='TURN';node.dispatchEvent(new Event('change',{bubbles:true}));});
  await studio.locator('[data-cutscene-time]').evaluate((node:HTMLInputElement)=>{node.value='2.2';node.dispatchEvent(new Event('change',{bubbles:true}));});
  await studio.locator('[data-cutscene-expression]').selectOption('sad');
  await studio.locator('[data-cutscene-pose]').selectOption('jump');
  await studio.locator('[data-cutscene-action]').selectOption('wave');
  await studio.locator('button[data-cutscene-camera-preset="face"]').click();
  await studio.locator('[data-cutscene-dialogue]').evaluate((node:HTMLInputElement)=>{node.value='Edited line.';node.dispatchEvent(new Event('change',{bubbles:true}));});
  await expect(studio.locator('button[data-cutscene-cue]').filter({hasText:'TURN'})).toHaveCount(1);
  await expect(page.locator('.cutscene-dialogue')).toHaveText('Edited line.');
  await expect(page.locator('.expression-bar [data-expression="sad"]')).toHaveClass(/selected/);
  await expect(page.locator('.motion-status-pill')).toContainText('JUMP');
  await expect(page.locator('.motion-status-pill')).toContainText('WAVE');

  const jsonDownloadPromise=page.waitForEvent('download');await studio.locator('button[data-cutscene-json]').click();const jsonDownload=await jsonDownloadPromise,jsonPath=await jsonDownload.path();expect(jsonPath).toBeTruthy();const project=JSON.parse(await readFile(jsonPath!,'utf8'));
  expect(project.title).toBe('CUSTOM REACTION');expect(project.durationMs).toBe(7500);const edited=project.cues.find((cue:{label:string})=>cue.label==='TURN');expect(edited).toMatchObject({timeMs:2200,expression:'sad',pose:'jump',action:'wave',dialogue:'Edited line.',camera:{zoom:1.58,panX:0,panY:.22}});

  const sheetDownloadPromise=page.waitForEvent('download');await studio.locator('button[data-cutscene-sheet]').click();const sheetDownload=await sheetDownloadPromise,sheetPath=await sheetDownload.path();expect(sheetPath).toBeTruthy();expect(sheetDownload.suggestedFilename()).toContain('cutscene-shot-sheet.png');expect((await stat(sheetPath!)).size).toBeGreaterThan(10000);
  await page.screenshot({path:'test-results/cutscene-studio-authoring.png',fullPage:true});
});

test('Cutscene Studio keeps primary controls finger-sized on iPhone landscape',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');
  await page.locator('.top-actions button[data-cutscene-open]').click();const studio=page.locator('.cutscene-studio');await expect(studio).toBeVisible();
  const controls=[studio.locator('button[data-cutscene-template]').first(),studio.locator('button[data-cutscene-play]'),studio.locator('button[data-cutscene-add]'),studio.locator('[data-cutscene-expression]'),studio.locator('[data-cutscene-camera="zoom"]')];
  for(const control of controls){const box=await control.boundingBox();expect(box).toBeTruthy();expect(box!.height).toBeGreaterThanOrEqual(44);}
  await expect(page.locator('.cutscene-status-pill')).toBeVisible();
  await page.screenshot({path:'test-results/cutscene-studio-iphone-landscape.png',fullPage:true});
});
