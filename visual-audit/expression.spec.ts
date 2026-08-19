import { test,expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('Expression System switches non-destructive previews, exports the set, and survives Factory handoff',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto('http://127.0.0.1:4173/?renderer=canvas2d');

  const bar=page.locator('.expression-bar');
  await expect(bar).toBeVisible();
  await expect(bar.locator('button[data-expression]')).toHaveCount(8);
  await expect(bar.locator('[data-expression="neutral"]')).toHaveClass(/selected/);

  const canvas=page.locator('.character-canvas');
  await expect(canvas).toBeVisible();
  const baseImage=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());
  const baseMouth=await page.locator('#mouth-options .part-card.selected').getAttribute('data-id');

  await bar.locator('[data-expression="angry"]').click();
  await expect(bar.locator('[data-expression="angry"]')).toHaveClass(/selected/);
  const angryImage=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());
  expect(angryImage).not.toBe(baseImage);
  await expect(page.locator('#mouth-options .part-card.selected')).toHaveAttribute('data-id',baseMouth??'smile-open');

  const downloadPromise=page.waitForEvent('download');
  await page.locator('button[data-action="export"]').click();
  const download=await downloadPromise,path=await download.path();
  expect(path).toBeTruthy();
  const exported=JSON.parse(await readFile(path!,'utf8'));
  expect(exported.definition.mouthStyle).toBe(baseMouth);
  expect(exported.expressions.active).toBe('angry');
  expect(Object.keys(exported.expressions.set.expressions)).toHaveLength(8);
  expect(exported.expressions.set.defaultExpression).toBe('neutral');

  await bar.locator('[data-expression="neutral"]').click();
  const neutralAgain=await canvas.evaluate((node:HTMLCanvasElement)=>node.toDataURL());
  expect(neutralAgain).toBe(baseImage);

  await bar.locator('[data-expression="happy"]').click();
  const hairBefore=await page.locator('#hair-options .part-card.selected').getAttribute('data-id');
  await page.locator('#hair-options .part-card:not(.selected)').first().click();
  await expect(bar.locator('[data-expression="happy"]')).toHaveClass(/selected/);
  const hairAfter=await page.locator('#hair-options .part-card.selected').getAttribute('data-id');
  expect(hairAfter).not.toBe(hairBefore);

  await page.locator('button[data-factory-open]').click();
  const factory=page.locator('.factory-panel');await expect(factory).toBeVisible();
  await factory.locator('[data-factory-action="use"]').click();
  await expect(factory).toBeHidden();
  await expect(bar.locator('[data-expression="happy"]')).toHaveClass(/selected/);

  await page.screenshot({path:'test-results/expression-v1.png',fullPage:true});
});