import { test,expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const setRange=async(locator:ReturnType<Parameters<typeof test>[0]> extends never?never:any,value:string)=>{
  await locator.evaluate((node:HTMLInputElement,next:string)=>{node.value=next;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},value);
};

test('Body Size changes only the body with three simple controls and reset',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');

  const panel=page.locator('#body-size-section');
  await expect(panel).toBeVisible();
  await expect(panel.getByText('FACE SIZE LOCKED')).toBeVisible();
  await expect(panel.locator('input[data-body-prop]')).toHaveCount(3);

  const faceBefore=await page.locator('#face-options .part-card.selected').getAttribute('data-id');
  const eyeBefore=await page.locator('#eye-options .part-card.selected').getAttribute('data-id');
  const hairBefore=await page.locator('#hair-options .part-card.selected').getAttribute('data-id');
  const canvas=page.locator('.character-canvas');await expect(canvas).toBeVisible();
  const imageBefore=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());

  await page.locator('input[data-body-prop="height"]').evaluate((node:HTMLInputElement)=>{node.value='1.2';node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('input[data-body-prop="build"]').evaluate((node:HTMLInputElement)=>{node.value='1.16';node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('input[data-body-prop="shoulders"]').evaluate((node:HTMLInputElement)=>{node.value='1.24';node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});

  await expect(page.locator('input[data-body-prop="height"]')).toHaveValue('1.2');
  await expect(page.locator('#face-options .part-card.selected')).toHaveAttribute('data-id',faceBefore??'soft');
  await expect(page.locator('#eye-options .part-card.selected')).toHaveAttribute('data-id',eyeBefore??'bright');
  await expect(page.locator('#hair-options .part-card.selected')).toHaveAttribute('data-id',hairBefore??'ponytail');
  const imageAfter=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());expect(imageAfter).not.toBe(imageBefore);

  await page.locator('.expression-bar [data-expression="angry"]').click();
  await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);
  await page.locator('input[data-body-prop="build"]').evaluate((node:HTMLInputElement)=>{node.value='.9';node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});
  await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);

  const downloadPromise=page.waitForEvent('download');await page.locator('button[data-action="export"]').click();const download=await downloadPromise,path=await download.path();expect(path).toBeTruthy();
  const exported=JSON.parse(await readFile(path!,'utf8'));expect(exported.definition.bodyProportions).toEqual({height:1.2,build:.9,shoulders:1.24});expect(exported.expressions.active).toBe('angry');

  await panel.locator('button[data-action="reset-body"]').click();
  await expect(page.locator('input[data-body-prop="height"]')).toHaveValue('1');
  await expect(page.locator('input[data-body-prop="build"]')).toHaveValue('1');
  await expect(page.locator('input[data-body-prop="shoulders"]')).toHaveValue('1');
  await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);

  await page.screenshot({path:'test-results/body-proportions-v1.png',fullPage:true});
});