import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('CharacterBundle SAVE/LOAD and JSON IMPORT restore body and bundled expression state',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');

  await page.locator('.expression-bar [data-expression="angry"]').click();
  await page.locator('input[data-body-prop="height"]').evaluate((node:HTMLInputElement)=>{node.value='1.2';node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#hair-options .part-card:not(.selected)').first().click();
  const savedHair=await page.locator('#hair-options .part-card.selected').getAttribute('data-id');

  await page.locator('button[data-slot="2"]').click();
  await page.locator('button[data-action="save-slot"]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('face-editor:slot:2')??'null'));
  expect(saved.format).toBe('face-editor-polygon-character');
  expect(saved.expressions.active).toBe('angry');
  expect(Object.keys(saved.expressions.set.expressions)).toHaveLength(8);

  await page.locator('.expression-bar [data-expression="neutral"]').click();
  await page.locator('input[data-body-prop="height"]').evaluate((node:HTMLInputElement)=>{node.value='1';node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('button[data-slot="2"]').click();
  await page.locator('button[data-action="load-slot"]').click();
  await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);
  await expect(page.locator('input[data-body-prop="height"]')).toHaveValue('1.2');
  await expect(page.locator('#hair-options .part-card.selected')).toHaveAttribute('data-id',savedHair??'');
  await expect(page.locator('#save-status')).toHaveText(/LOADED SLOT 2/);

  const downloadPromise=page.waitForEvent('download');
  await page.locator('button[data-action="export"]').click();
  const download=await downloadPromise,path=await download.path();
  expect(path).toBeTruthy();
  const exported=JSON.parse(await readFile(path!,'utf8'));
  expect(exported.expressions.active).toBe('angry');

  await page.locator('.expression-bar [data-expression="sad"]').click();
  await page.locator('#bundle-import-input').setInputFiles(path!);
  await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);
  await expect(page.locator('input[data-body-prop="height"]')).toHaveValue('1.2');
  await expect(page.locator('#save-status')).toHaveText(/EXPRESSIONS RESTORED/);
});
