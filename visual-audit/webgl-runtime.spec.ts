import { test,expect } from '@playwright/test';

test('default desktop runtime uses WebGL and survives editing workflows',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1280,height:720});await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('#renderer-mode')).toHaveText('WEBGL');
  const canvas=page.locator('canvas.character-canvas[data-renderer="webgl"]');await expect(canvas).toBeVisible();
  await page.locator('.expression-bar [data-expression="angry"]').click();await expect(page.locator('.expression-bar [data-expression="angry"]')).toHaveClass(/selected/);
  await page.locator('button[data-preview-focus="dim"]').click();await expect(page.locator('button[data-preview-focus="dim"]')).toHaveClass(/selected/);
  await page.locator('button[data-motion-open]').click();await page.locator('button[data-motion-pose="fight"]').click();await page.locator('button[data-motion-action="wave"]').click();await page.waitForTimeout(180);
  await page.locator('button[data-motion-close]').click();await page.locator('button[data-cutscene-open]').click();await page.locator('button[data-cutscene-template="battle"]').click();await expect(page.locator('.cutscene-studio')).toBeVisible();
  expect(errors).toEqual([]);await page.screenshot({path:'test-results/webgl-runtime.png',fullPage:true});
});
