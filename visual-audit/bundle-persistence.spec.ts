import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('CharacterBundle SAVE/LOAD and JSON IMPORT restore body, expression, Motion and Cutscene state',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');

  await page.locator('.expression-bar [data-expression="angry"]').click();
  await page.locator('input[data-body-prop="height"]').evaluate((node:HTMLInputElement)=>{node.value='1.2';node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#hair-options .part-card:not(.selected)').first().click();
  const savedHair=await page.locator('#hair-options .part-card.selected').getAttribute('data-id');

  await page.locator('.top-actions button[data-cutscene-open]').click();
  const studio=page.locator('.cutscene-studio');await studio.locator('button[data-cutscene-template="battle"]').click();
  await studio.locator('[data-cutscene-title]').evaluate((node:HTMLInputElement)=>{node.value='SLOT SCENE';node.dispatchEvent(new Event('change',{bubbles:true}));});
  await studio.locator('button[data-cutscene-cue]').nth(2).click();
  await studio.locator('[data-cutscene-dialogue]').evaluate((node:HTMLInputElement)=>{node.value='Stored cutscene line.';node.dispatchEvent(new Event('change',{bubbles:true}));});
  await studio.locator('button[data-cutscene-close]').click();
  await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);

  await page.locator('button[data-slot="2"]').click();
  await page.locator('button[data-action="save-slot"]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('face-editor:slot:2')??'null'));
  expect(saved.format).toBe('face-editor-polygon-character');
  expect(saved.expressions.active).toBe('angry');
  expect(Object.keys(saved.expressions.set.expressions)).toHaveLength(8);
  expect(saved.motion).toEqual({version:1,pose:'idle',action:'breathe',playing:false,autoBlink:true});
  expect(saved.cutscene.title).toBe('SLOT SCENE');
  expect(saved.cutscene.cues).toHaveLength(5);
  expect(saved.cutscene.cues[2].dialogue).toBe('Stored cutscene line.');

  await page.locator('.expression-bar [data-expression="neutral"]').click();
  await page.locator('input[data-body-prop="height"]').evaluate((node:HTMLInputElement)=>{node.value='1';node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('.top-actions button[data-cutscene-open]').click();await studio.locator('button[data-cutscene-template="intro"]').click();await studio.locator('button[data-cutscene-close]').click();
  await page.locator('button[data-slot="2"]').click();
  await page.locator('button[data-action="load-slot"]').click();
  await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);
  await expect(page.locator('input[data-body-prop="height"]')).toHaveValue('1.2');
  await expect(page.locator('#hair-options .part-card.selected')).toHaveAttribute('data-id',savedHair??'');
  await expect(page.locator('#save-status')).toHaveText(/LOADED SLOT 2/);
  await page.locator('.top-actions button[data-cutscene-open]').click();
  await expect(studio.locator('[data-cutscene-title]')).toHaveValue('SLOT SCENE');
  await expect(studio.locator('button[data-cutscene-cue]')).toHaveCount(5);
  await studio.locator('button[data-cutscene-cue]').nth(2).click();await expect(studio.locator('[data-cutscene-dialogue]')).toHaveValue('Stored cutscene line.');
  await studio.locator('button[data-cutscene-close]').click();

  const downloadPromise=page.waitForEvent('download');
  await page.locator('button[data-action="export"]').click();
  const download=await downloadPromise,path=await download.path();
  expect(path).toBeTruthy();
  const exported=JSON.parse(await readFile(path!,'utf8'));
  expect(exported.expressions.active).toBe('angry');
  expect(exported.motion).toEqual(saved.motion);
  expect(exported.cutscene).toEqual(saved.cutscene);

  await page.locator('.expression-bar [data-expression="sad"]').click();
  await page.locator('#bundle-import-input').setInputFiles(path!);
  await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);
  await expect(page.locator('input[data-body-prop="height"]')).toHaveValue('1.2');
  await expect(page.locator('#save-status')).toHaveText(/CUTSCENE RESTORED/);
  await page.locator('.top-actions button[data-cutscene-open]').click();await expect(studio.locator('[data-cutscene-title]')).toHaveValue('SLOT SCENE');await studio.locator('button[data-cutscene-close]').click();
});
